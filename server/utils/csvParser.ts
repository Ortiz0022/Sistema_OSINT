import { parse } from 'csv-parse';

function decodeHTMLEntities(text: string): string {
  if (!text) return '';
  return text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
}

export async function parseCSV(csvText: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    parse(csvText, {
      columns: false,
      skip_empty_lines: true,
      delimiter: ',', 
      trim: true,
      bom: true, 
      from_line: 2 // Skip the header row
    }, (err, records: string[][]) => {
      if (err) {
        console.error('Error parseando CSV:', err);
        return reject(err);
      }

      const validRecords = [];
      for (const row of records) {
        // La estructura real debe tener al menos 12 columnas
        // 0  Delito
        // 1  SubDelito
        // 2  Fecha
        // 3  Hora/franja horaria
        // 4  Victima
        // 5  SubVictima
        // 6  Edad
        // 7  Sexo
        // 8  Nacionalidad
        // 9  Provincia
        // 10 Canton
        // 11 Distrito
        
        if (row.length < 12) continue; // Fila malformada

        const delito = decodeHTMLEntities(row[0]);
        const subdelito = decodeHTMLEntities(row[1]);
        const fecha = decodeHTMLEntities(row[2]);
        const provincia = decodeHTMLEntities(row[9]);
        const canton = decodeHTMLEntities(row[10]);
        const distrito = decodeHTMLEntities(row[11]);

        validRecords.push({
          Delito: delito,
          SubDelito: subdelito,
          Fecha: fecha,
          Provincia: provincia,
          Canton: canton,
          Distrito: distrito
        });
      }

      resolve(validRecords);
    });
  });
}
