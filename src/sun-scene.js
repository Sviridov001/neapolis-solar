import * as T from 'three';

export function createRaySector(slices, point, radius) {
  const group = new T.Group(), origin = new T.Vector3(...point);
  const vertices = [[], []], arc = [], colors = [], boundaries = [];
  const edge = v => origin.clone().addScaledVector(new T.Vector3(v.x, v.y, v.z), radius);
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i], a = edge(slice.a), b = edge(slice.b), color = new T.Color(slice.sunlit ? 0xffcc55 : 0x80c7ca);
    vertices[+slice.sunlit].push(...point, ...a.toArray(), ...b.toArray());
    arc.push(...a.toArray(), ...b.toArray());colors.push(...color.toArray(), ...color.toArray());
    if (slice.sunlit && (!slices[i - 1]?.sunlit || slice.a.minute !== slices[i - 1].b.minute)) boundaries.push(...point, ...a.toArray());
    if (slice.sunlit && (!slices[i + 1]?.sunlit || slice.b.minute !== slices[i + 1].a.minute)) boundaries.push(...point, ...b.toArray());
  }
  for (const lit of [0, 1]) if (vertices[lit].length) {
    const geometry = new T.BufferGeometry();geometry.setAttribute('position', new T.Float32BufferAttribute(vertices[lit], 3));
    const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: lit ? 0xffcc55 : 0x80c7ca, side: T.DoubleSide, transparent: true, opacity: lit ? .36 : .12, depthWrite: false }));
    mesh.userData.sunlit = !!lit;mesh.renderOrder = 2;group.add(mesh);
  }
  if (arc.length) {
    const geometry = new T.BufferGeometry();geometry.setAttribute('position', new T.Float32BufferAttribute(arc, 3));geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    group.add(new T.LineSegments(geometry, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, depthWrite: false })));
  }
  if (boundaries.length) {
    const geometry = new T.BufferGeometry();geometry.setAttribute('position', new T.Float32BufferAttribute(boundaries, 3));
    group.add(new T.LineSegments(geometry, new T.LineBasicMaterial({ color: 0xffcc55, transparent: true, opacity: .7, depthWrite: false })));
  }
  group.userData.sunlitMinutes = slices.filter(s => s.sunlit).reduce((sum, s) => sum + s.b.minute - s.a.minute, 0);
  return group;
}

export function createSunGlyph() {
  const group = new T.Group();
  const sphere = new T.Mesh(new T.SphereGeometry(1, 20, 12), new T.MeshBasicMaterial({ color: 0xffe390, depthTest: false, toneMapped: false }));
  sphere.renderOrder = 12;group.add(sphere);
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, r = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
    data.set([255, 194, 65, Math.round(Math.max(0, 1 - r) ** 2 * 180)], i);
  }
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat);texture.needsUpdate = true;texture.magFilter = texture.minFilter = T.LinearFilter;
  const halo = new T.Sprite(new T.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  halo.scale.set(5, 5, 1);halo.renderOrder = 11;group.add(halo);group.visible = false;
  return group;
}

export function positionSunGlyph(glyph, direction, anchor, radius, enabled = true) {
  glyph.visible = enabled && direction.y > 0;
  glyph.position.copy(anchor).addScaledVector(direction, radius);
  glyph.scale.setScalar(radius * .018);
}
