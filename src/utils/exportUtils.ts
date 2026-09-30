import * as XLSX from 'xlsx';

export function exportTableToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportTableToCsv(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
