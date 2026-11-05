export interface TreeUnit {
  id: string
  name: string
  levelName: string
  parentId: string | null
}

export interface UnitNode extends TreeUnit {
  children: UnitNode[]
}

/** The org units as a tree, by name: a unit whose parent is missing from the list is treated as a root. */
export function unitTree(units: TreeUnit[]): UnitNode[] {
  const nodes = new Map(units.map((u) => [u.id, { ...u, children: [] as UnitNode[] }]))
  const roots: UnitNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sort = (list: UnitNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name))
    list.forEach((n) => sort(n.children))
  }
  sort(roots)
  return roots
}

/** Every unit beneath `node`, at any depth. */
export function descendantIds(node: UnitNode): string[] {
  return node.children.flatMap((child) => [child.id, ...descendantIds(child)])
}

/** The ids of every unit that has units beneath it. */
export function branchIds(roots: UnitNode[]): string[] {
  return roots.flatMap((node) => (node.children.length > 0 ? [node.id, ...branchIds(node.children)] : []))
}

/** Units that match `query` (by name), with the units above them so a match is never orphaned. Null query = everything. */
export function filterTree(roots: UnitNode[], query: string): UnitNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return roots
  const walk = (nodes: UnitNode[]): UnitNode[] =>
    nodes.flatMap((node) => {
      const kept = walk(node.children)
      return node.name.toLowerCase().includes(q) || kept.length > 0 ? [{ ...node, children: node.name.toLowerCase().includes(q) ? node.children : kept }] : []
    })
  return walk(roots)
}
