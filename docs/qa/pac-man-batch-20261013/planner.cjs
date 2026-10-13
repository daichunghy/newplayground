/*
 * Read-only route planner for the natural browser run. It receives copied game
 * state and only chooses keyboard directions; it never edits the simulation.
 */
function graph(map) {
  const cols = map[0].length, rows = map.length;
  const node = (x, y) => y * cols + x;
  const xy = n => ({ x: n % cols, y: Math.floor(n / cols) });
  const dirs = [{ x: 0, y: -1, key: 'up' }, { x: -1, y: 0, key: 'left' }, { x: 0, y: 1, key: 'down' }, { x: 1, y: 0, key: 'right' }];
  const neighbors = n => {
    const { x, y } = xy(n), out = [];
    for (const dir of dirs) {
      let nx = x + dir.x, ny = y + dir.y;
      if (ny < 0 || ny >= rows) continue;
      if ((nx < 0 || nx >= cols) && ny === 10) nx = (nx + cols) % cols;
      if (nx < 0 || nx >= cols || map[ny][nx] === 1) continue;
      out.push({ n: node(nx, ny), dir: dir.key });
    }
    return out;
  };
  return { cols, rows, node, xy, neighbors };
}

function bfs(g, start) {
  const size = g.cols * g.rows;
  const dist = new Int16Array(size); dist.fill(-1);
  const prev = new Int16Array(size); prev.fill(-1);
  const first = new Array(size).fill(null);
  const q = new Int16Array(size); let head = 0, tail = 0;
  q[tail++] = start; dist[start] = 0;
  while (head < tail) {
    const cur = q[head++];
    for (const edge of g.neighbors(cur)) if (dist[edge.n] === -1) {
      dist[edge.n] = dist[cur] + 1;
      prev[edge.n] = cur;
      first[edge.n] = cur === start ? edge.dir : first[cur];
      q[tail++] = edge.n;
    }
  }
  return { dist, prev, first };
}

function plan(s, previousTarget) {
  const g = graph(s.maze), p = s.player;
  let sx = p.x, sy = p.y;
  if (p.progress > 0.05 && (p.dirX || p.dirY)) {
    const direction = { '0,-1': 'up', '-1,0': 'left', '0,1': 'down', '1,0': 'right' }[`${p.dirX},${p.dirY}`];
    const next = g.neighbors(g.node(p.x, p.y)).find(edge => edge.dir === direction);
    if (next) ({ x: sx, y: sy } = g.xy(next.n));
  }
  const start = g.node(sx, sy), routes = bfs(g, start);
  const ghostRoutes = s.ghosts.map(ghost => bfs(g, g.node(ghost.x, ghost.y)));

  // Take a nearby safe turn when a released ghost is closing in.
  if (!s.frightenedTimer && s.ghostMode !== 'scatter') {
    const active = s.ghosts.map((ghost, index) => ({ ghost, index, dist: ghostRoutes[index].dist[start] }))
      .filter(({ ghost }) => ghost.releaseTimer <= 0 && ghost.respawnTimer <= 0);
    const nearest = active.length ? Math.min(...active.map(({ dist, ghost }) => dist - ghost.progress / 32)) : Infinity;
    if (nearest <= 6) {
      const current = { '0,-1': 'up', '-1,0': 'left', '0,1': 'down', '1,0': 'right' }[`${p.dirX},${p.dirY}`];
      const reverse = { up: 'down', down: 'up', left: 'right', right: 'left' }[current];
      const options = g.neighbors(start).filter(edge => p.progress <= 0.05 || edge.dir !== reverse);
      const ranked = options.map(edge => {
        const distances = active.map(({ ghost, index }) => ghostRoutes[index].dist[edge.n] - ghost.progress / 32);
        const nearestGhost = distances.length ? Math.min(...distances) : 12;
        const average = distances.length ? distances.reduce((sum, value) => sum + value, 0) / distances.length : 12;
        const { x, y } = g.xy(edge.n), tile = s.maze[y][x], degree = g.neighbors(edge.n).length;
        return { dir: edge.dir, score: nearestGhost * 5 + average * 0.25 + (tile === 3 ? 8 : tile === 2 ? 0.5 : 0) - (degree <= 1 ? 4 : 0) };
      }).sort((a, b) => b.score - a.score);
      if (ranked[0]) return { dir: ranked[0].dir, target: previousTarget };
    }
  }

  const pellets = [];
  for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
    if (s.maze[y][x] === 2 || s.maze[y][x] === 3) pellets.push({ n: g.node(x, y), power: s.maze[y][x] === 3 });
  }
  const reservedPower = previousTarget?.power && previousTarget.x === 1 && previousTarget.y === 17 && s.pelletsLeft > 25;
  const sticky = previousTarget && !reservedPower &&
    (s.maze[previousTarget.y]?.[previousTarget.x] === 2 || s.maze[previousTarget.y]?.[previousTarget.x] === 3) &&
    (s.frightenedTimer > 0 || previousTarget.power);
  if (sticky) {
    pellets.splice(0, pellets.length, ...pellets.filter(pellet => pellet.n === g.node(previousTarget.x, previousTarget.y)));
  } else if (!s.frightenedTimer) {
    const powers = pellets.filter(pellet => pellet.power && !(s.pelletsLeft > 25 && pellet.n === g.node(1, 17)));
    const endgame = pellets.find(pellet => pellet.power && pellet.n === g.node(1, 17));
    if (s.pelletsLeft <= 25 && endgame) pellets.splice(0, pellets.length, endgame);
    else if (powers.length) {
      const farthest = Math.max(...powers.map(pellet => routes.dist[pellet.n]));
      pellets.splice(0, pellets.length, ...powers.filter(pellet => routes.dist[pellet.n] === farthest));
    }
  }

  let best = null;
  for (const target of pellets) {
    const distance = routes.dist[target.n];
    if (distance < 0) continue;
    let risk = 0;
    if (!s.frightenedTimer && s.ghostMode !== 'scatter') {
      const steps = [];
      let cursor = target.n;
      while (cursor !== start && cursor >= 0) { steps.push(cursor); cursor = routes.prev[cursor]; }
      steps.reverse();
      for (let i = 0; i < Math.min(steps.length, 12); i++) for (let j = 0; j < s.ghosts.length; j++) {
        const ghost = s.ghosts[j];
        if (ghost.releaseTimer > i * 0.25 + 0.2 || ghost.respawnTimer > i * 0.25 + 0.2) continue;
        const ghostDistance = ghostRoutes[j].dist[steps[i]];
        if (ghostDistance < 0) continue;
        const safety = ghostDistance - (ghost.speed / 128) * (i + 1) - ghost.progress / 32;
        if (safety < 1.4) risk += (1.4 - safety) ** 2;
      }
    }
    const score = distance + risk * 5 - (target.power ? 1.5 : 0);
    if (!best || score < best.score) best = { score, target, dir: routes.first[target.n] };
  }
  if (!best?.dir) return { dir: null, target: null };
  return { dir: best.dir, target: best.target };
}

module.exports = { plan };
