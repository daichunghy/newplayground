"""Regenerate operational inventory/backlog from catalog, exact registry and pilot plans."""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
games = json.loads((ROOT / 'data/games.json').read_text())
registry_text = (ROOT / 'scripts/game-registry.js').read_text()
registry = dict(re.findall(r"^    '([^']+)': '(launch\w+)'", registry_text, re.M))
pilots = json.loads((ROOT / 'data/game-pilot-plans.json').read_text())['plans']
pilot_by_id = {plan['id']: plan for plan in pilots}
quality = json.loads((ROOT / 'data/game-quality-evidence.json').read_text())['games']
operations_path = ROOT / 'data/game-operations.json'
previous_operations = json.loads(operations_path.read_text()) if operations_path.exists() else {'games': []}
previous_by_id = {item['id']: item for item in previous_operations.get('games', [])}
gate_names = ['reference_parity', 'content', 'controls', 'visual_audio', 'device_qa',
              'save_recovery', 'playtest', 'distribution_rights']
unknown_quality_ids = set(quality) - {game['id'] for game in games}
if unknown_quality_ids:
    raise ValueError(f'Quality evidence has unknown game IDs: {unknown_quality_ids}')
ordered_ids = [plan['id'] for plan in sorted(pilots, key=lambda plan: plan['order'])]
ordered_ids += [game['id'] for game in games if game['id'] in registry and game['id'] not in pilot_by_id]
# Explicit discovery sequence; popularity remains unmeasured.
discovery_first = ['xep-bai-solitaire', 'xep-bai-freecell', 'xep-bai-nhen-spider',
                   'arkanoid-dap-gach', 'puzzle-bobble-khung-long', 'dr-mario-diet-khuan']
ordered_ids += [game_id for game_id in discovery_first if game_id not in registry]
ordered_ids += [game['id'] for game in games if game['id'] not in ordered_ids]
order = {game_id: index + 1 for index, game_id in enumerate(ordered_ids)}
inventory = []
for game in games:
    game_id = game['id']
    pilot = pilot_by_id.get(game_id)
    engine = registry.get(game_id)
    evidence = quality.get(game_id, {})
    research = evidence.get('research', {})
    previous = previous_by_id.get(game_id, {})
    gates = {key: evidence.get('gates', {}).get(key, {}).get('status', 'pending') for key in gate_names}
    evidence_complete = all(
        gates[key] == 'accepted' and evidence.get('gates', {}).get(key, {}).get('evidence')
        for key in gate_names)
    ready = bool(engine and evidence_complete and evidence.get('accepted_build') and
                 evidence.get('owner') and evidence.get('accepted_at') and
                 evidence.get('reference_version') and
                 evidence.get('scope') in ['limited-release', 'reference-complete'])
    rules_task = research.get('rules_task') or previous.get('rules_task') or (pilot['rules_task'] if pilot else (
        f"Khóa bản tham chiếu và lập state machine riêng cho {game['title']}: {game.get('mechanic', '')}. "
        "Đối chiếu core loop, thắng/thua, scoring và ngoại lệ luật; ghi từng khác biệt."))
    first_delivery = ('Hoàn thiện hồ sơ và vòng chơi pilot' if pilot else
                      'Đối chiếu prototype với bản tham chiếu trước khi sửa nội dung' if engine else
                      'Hồ sơ tham chiếu + estimate + engine riêng cho cơ chế này')
    phase = ('P1A' if pilot and pilot['order'] <= 4 else 'P1B' if pilot and pilot['order'] <= 8 else
             'P1C' if pilot else 'P2' if engine else 'P3-discovery')
    inventory.append({
        'id': game_id, 'title': game['title'], 'engine': engine,
        'status': 'prototype' if engine else 'planned', 'work_order': order[game_id], 'phase': phase,
        'reference_version': research.get('reference_version') or previous.get('reference_version') or (pilot['reference_version'] if pilot else None),
        'first_delivery': research.get('first_delivery') or previous.get('first_delivery') or first_delivery,
        'rules_task': rules_task,
        'content_task': research.get('content_task') or previous.get('content_task') or (pilot['progression_items_task'] if pilot else
            f"Lập inventory màn/chế độ/vật phẩm cho {game['title']}; chọn release scope sau nghiên cứu; không đổi tên engine khác."),
        'controls_task': research.get('controls_task') or previous.get('controls_task') or (pilot['controls_task'] if pilot else
            f"Ghi binding desktop/touch và thông số chuyển động cho cơ chế {game.get('mechanic', game['category'])}; đo từ bản tham chiếu."),
        'visual_feel_task': research.get('visual_feel_task') or previous.get('visual_feel_task') or (pilot['visual_feel_task'] if pilot else
            'Bộ art/audio nhất quán, hitbox và feedback đọc được; audit FPS/frame pacing/input-to-feedback theo thiết bị.'),
        'acceptance': research.get('acceptance') or previous.get('acceptance') or (pilot['acceptance'] if pilot else
            'Đúng cơ chế và phạm vi đã chốt; đủ win/loss/replay; đầu vào không kẹt; save/cleanup/performance có chứng cứ.'),
        'source_urls': research.get('source_urls') or previous.get('source_urls') or (pilot['source_urls'] if pilot else []),
        'research_status': research.get('status') or previous.get('research_status') or ('desk-research-partial' if pilot else 'reference-research-pending'),
        'evidence_date': research.get('evidence_date') or previous.get('evidence_date') or (pilot['observation_date'] if pilot else None),
        'owner_role': 'Game owner (chưa phân công người)', 'estimated_person_days': None,
        'release_ready': ready, 'accepted_scope': evidence.get('scope') if ready else None,
        'quality_evidence': evidence or previous.get('quality_evidence'), 'release_gates': gates
    })

(ROOT / 'data/game-operations.json').write_text(json.dumps({
    'schema_version': 1, 'updated_at': '2026-10-08',
    'baseline': {'catalog': len(games), 'prototype_engines': len(registry),
                 'planned': len(games) - len(registry),
                 'certified_complete': sum(item['release_ready'] and item['accepted_scope'] == 'reference-complete'
                                           for item in inventory)},
    'expansion_goal': 500, 'games': inventory
}, ensure_ascii=False, indent=2) + '\n')

backlog = ROOT / 'docs/GAME_RESEARCH_BACKLOG.csv'
with backlog.open(encoding='utf-8-sig', newline='') as file:
    reader = csv.DictReader(file)
    fields = reader.fieldnames
    old_rows = {row['id']: row for row in reader}
extra = ['engine_name', 'work_order', 'first_delivery', 'acceptance_criteria', 'release_state', 'estimated_person_days']
fields = list(dict.fromkeys(fields + extra))
rows = []
for item in sorted(inventory, key=lambda item: item['work_order']):
    row = old_rows.get(item['id'], {field: '' for field in fields})
    pilot = pilot_by_id.get(item['id'])
    research = quality.get(item['id'], {}).get('research', {})
    row.update(id=item['id'], title=item['title'], priority_wave=item['phase'],
               status=('Prototype riêng; nghiên cứu nguồn một phần' if pilot else
                       research.get('backlog_status', row.get('status') or
                           ('Prototype riêng; chưa khảo sát bản tham chiếu' if item['engine'] else
                            'Chưa có engine riêng; cần nghiên cứu và xây mới'))),
               engine_name=item['engine'] or '', work_order=item['work_order'],
               first_delivery=item['first_delivery'], acceptance_criteria=item['acceptance'],
               release_state=(item['accepted_scope'] if item['release_ready'] else 'Chưa nghiệm thu hoàn chỉnh'),
               estimated_person_days='',
               competitor_source_urls=' | '.join(item['source_urls']), observation_date=item['evidence_date'] or '')
    if pilot:
        row.update(benchmark_archetype=row.get('benchmark_archetype') or pilot['reference_version'],
                   progression_and_items_to_research=row.get('progression_and_items_to_research') or pilot['progression_items_task'],
                   controls_sensitivity_to_measure=row.get('controls_sensitivity_to_measure') or pilot['controls_task'],
                   visual_assets_and_license_to_resolve=row.get('visual_assets_and_license_to_resolve') or (pilot['visual_feel_task'] + '; rà quyền từng tài sản và tên phát hành.'),
                   feel_speed_and_performance_to_measure=row.get('feel_speed_and_performance_to_measure') or ('Đo frame-time/FPS/input latency trên thiết bị; chưa có số đo. ' + pilot['acceptance']))
        if item['id'] == 'tro-choi-2048' and not row.get('rights_status'):
            row['rights_status'] = 'Mã tham chiếu gốc MIT; quyền tài sản/tên của bản phát hành chưa nghiệm thu'
    elif research.get('reference_version'):
        row.update(current_mechanic=research.get('current_mechanic', row['current_mechanic']),
                   benchmark_archetype=research['reference_version'],
                   progression_and_items_to_research=research.get('progression_and_items_to_research', row['progression_and_items_to_research']),
                   controls_sensitivity_to_measure=research.get('controls_task', row['controls_sensitivity_to_measure']),
                   visual_assets_and_license_to_resolve=research.get('visual_assets_and_license_to_resolve', row['visual_assets_and_license_to_resolve']),
                   feel_speed_and_performance_to_measure=research.get('feel_speed_and_performance_to_measure', row['feel_speed_and_performance_to_measure']),
                   rights_status=research.get('rights_status', row['rights_status']))
    rows.append(row)
with backlog.open('w', encoding='utf-8', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)

profiles = ROOT / 'docs/game-profiles'
profiles.mkdir(exist_ok=True)
for pilot in pilots:
    lines = [f"# {pilot_by_id[pilot['id']]['reference_version']}", '',
             f"ID: `{pilot['id']}` · Thứ tự pilot: {pilot['order']} · Cập nhật: {pilot['observation_date']}", '',
             '**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**', '',
             '## Hiện trạng từ mã nguồn', '', pilot['source_review'], '',
             f"Mã nguồn: `{pilot['code_file']}`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.", '',
             '## Các việc phải hoàn thiện', '']
    for label, key in [('Luật', 'rules_task'), ('Phím và độ nhạy', 'controls_task'),
                       ('Tiến trình và vật phẩm', 'progression_items_task'), ('Hình ảnh và cảm giác chơi', 'visual_feel_task')]:
        lines += [f'- **{label}:** {pilot[key]}']
    lines += ['', '## Nghiệm thu đề xuất', '', pilot['acceptance'], '',
              'Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.', '',
              '## Nguồn cần đối chiếu', '']
    lines += [f'- [{url}]({url})' for url in pilot['source_urls']]
    lines += ['', 'Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. '
              'Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. '
              'URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.', '']
    profile_path = profiles / f"{pilot['id']}.md"
    # Preserve curated dossiers. Regeneration must not replace research or implementation evidence
    # with this short starter template; create only missing profiles for new pilots.
    if not profile_path.exists():
        profile_path.write_text('\n'.join(lines))
print(f"Synchronized {len(inventory)} games, {len(registry)} prototypes and {len(pilots)} pilot profiles")
