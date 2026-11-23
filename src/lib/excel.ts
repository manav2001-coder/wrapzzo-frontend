/**
 * The spreadsheet library is large (most of a megabyte) and is only needed when someone downloads a template or uploads a sheet, so it
 * is fetched on that click rather than shipped to everyone with the app.
 */
export async function loadExcelJs() {
  return (await import('exceljs')).default
}
