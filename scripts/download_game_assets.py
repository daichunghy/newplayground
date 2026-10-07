import urllib.request
import os
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))

ASSET_CONFIGS = [
    {
        "category": "food",
        "description": "30 món ăn, nguyên liệu, bánh mì, gia vị (Ca Phố, Hàng Rong)",
        "folder": os.path.join(BASE_DIR, "sprites/food"),
        "base_url": "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Pixel%20Platformer%20Food%20Expansion/Tiles/",
        "files": [f"tile_{i:04d}.png" for i in range(30)]
    },
    {
        "category": "items_coins",
        "description": "Tiền xu, ngọc quý, chìa khóa, huân chương, năng lượng",
        "folder": os.path.join(BASE_DIR, "sprites/items"),
        "base_url": "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Generic%20Items/Colored/",
        "files": [f"genericItem_color_{i:03d}.png" for i in range(1, 25)]
    },
    {
        "category": "ui_buttons",
        "description": "Nút bấm chữ nhật, nút tròn, nút đóng, nút tạm dừng, chia vạch",
        "folder": os.path.join(BASE_DIR, "ui"),
        "base_url": "https://raw.githubusercontent.com/shorepine/kenney/main/ui/UI%20Pack/Extra/",
        "files": [
            "button_rectangle_line.png",
            "button_rectangle_depth_line.png",
            "button_round_line.png",
            "button_round_depth_line.png",
            "button_square_line.png",
            "button_square_depth_line.png",
            "divider.png",
            "divider_edges.png",
            "icon_arrow_down_dark.png",
            "icon_arrow_up_dark.png"
        ]
    },
    {
        "category": "cards",
        "description": "Bộ bài Tây (Solitaire, Spider, FreeCell)",
        "folder": os.path.join(BASE_DIR, "sprites/cards"),
        "base_url": "https://raw.githubusercontent.com/shorepine/kenney/main/2d/Playing%20Cards%20Pack/Cards%20(medium)/",
        "files": [
            "card_back.png",
            "card_clubs_A.png", "card_clubs_K.png", "card_clubs_Q.png", "card_clubs_J.png", "card_clubs_10.png",
            "card_hearts_A.png", "card_hearts_K.png", "card_hearts_Q.png", "card_hearts_J.png", "card_hearts_10.png",
            "card_diamonds_A.png", "card_diamonds_K.png",
            "card_spades_A.png", "card_spades_K.png"
        ]
    },
    {
        "category": "audio",
        "description": "Âm thanh hiệu ứng UI & Gameplay CC0",
        "folder": os.path.join(BASE_DIR, "audio"),
        "base_url": "https://raw.githubusercontent.com/KenneyNL/Starter-Kit-Match-3/main/sounds/",
        "files": ["tile-land.ogg", "tile-match.ogg", "tile-swap.ogg"]
    }
]

def download_assets():
    print("=== TẢI & CẬP NHẬT KHO ASSETS THỰC TẾ TRÊN ĐĨA ===")
    total_downloaded = 0
    total_failed = 0
    manifest = []

    for cfg in ASSET_CONFIGS:
        folder = cfg["folder"]
        os.makedirs(folder, exist_ok=True)
        print(f"\n[+] Danh mục: {cfg['category']}")
        print(f"    Mô tả: {cfg['description']}")
        
        for fname in cfg["files"]:
            url = cfg["base_url"] + fname
            dest = os.path.join(folder, fname)
            try:
                urllib.request.urlretrieve(url, dest)
                size_kb = os.path.getsize(dest) / 1024
                print(f"    -> Đã tải: {fname} ({size_kb:.1f} KB)")
                total_downloaded += 1
                manifest.append({
                    "category": cfg["category"],
                    "file": fname,
                    "local_path": dest,
                    "size_bytes": os.path.getsize(dest),
                    "license": "CC0 1.0 Universal (Public Domain)",
                    "source": url
                })
            except Exception as e:
                print(f"    [!] Thất bại: {fname} (Lỗi: {e})")
                total_failed += 1

    manifest_path = os.path.join(BASE_DIR, "ASSET_MANIFEST.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        
    print(f"\n=== HOÀN TẤT ===")
    print(f"Tổng số tệp tải thành công: {total_downloaded}")
    print(f"Tổng số tệp thất bại: {total_failed}")
    print(f"Bảng kê ASSET_MANIFEST.json đã được cập nhật tại: {manifest_path}")

if __name__ == "__main__":
    download_assets()
