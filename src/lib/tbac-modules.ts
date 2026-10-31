/**
 * The module-name <-> template-name convention behind Quick Create and Quick Add.
 *
 * A template called "Users" is assumed to be the template for the `Users` module, so it can offer
 * "add all N Users features" in one click. That is as fragile as it sounds -- rename the template
 * and the shortcut silently disappears -- but it is also the fastest path from an empty install to
 * a working permission matrix, which is worth keeping. (This is MobixFL's convention.)
 *
 * MobixFL ships its catalogue in code; Wrappzo's lives on the server (`/api/tbac/features/catalogue`),
 * so every function here takes the catalogue it works on.
 */

export interface CatalogueEntry {
  id: string
  key: string
  moduleName: string
  actionName: string
}

export interface CatalogueModule {
  moduleName: string
  entries: CatalogueEntry[]
}

/** The catalogue grouped by module, in catalogue order. */
export function catalogueByModule(catalogue: readonly CatalogueEntry[]): CatalogueModule[] {
  const modules = new Map<string, CatalogueModule>()
  for (const entry of catalogue) {
    const group = modules.get(entry.moduleName) ?? { moduleName: entry.moduleName, entries: [] }
    group.entries.push(entry)
    modules.set(entry.moduleName, group)
  }
  return [...modules.values()]
}

/** Every quick-template name the catalogue offers: one per module. */
export function allModuleNames(catalogue: readonly CatalogueEntry[]): string[] {
  return catalogueByModule(catalogue).map((group) => group.moduleName)
}

/** The module a template's name refers to, or null when it names none. */
export function matchTemplateNameToModule(templateName: string, catalogue: readonly CatalogueEntry[]): string | null {
  const needle = templateName.trim().toLowerCase()
  return allModuleNames(catalogue).find((name) => name.toLowerCase() === needle) ?? null
}

/** The catalogue keys a quick template grants: one module's. */
export function moduleKeys(moduleName: string, catalogue: readonly CatalogueEntry[]): string[] {
  return catalogue.filter((entry) => entry.moduleName === moduleName).map((entry) => entry.key)
}
