import { pool } from '../db.js';
import { jsPDF } from 'jspdf';
import xlsx from 'xlsx';
import htmlToDocx from 'html-docx-js';

// Controlador para exportar a Excel
export const exportExcel = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservarentrevista');
        const data = result.rows;

        const worksheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Entrevistas');

        const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename=entrevistas.xlsx');
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error al exportar a Excel:', error.message);
        res.status(500).json({ error: 'Error al exportar a Excel' });
    }
};

// Controlador para exportar a PDF
export const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Listado de Entrevistas', 14, 10);
  
    const tableColumn = ['Orden', 'Nombres', 'Apellido Paterno', 'Apellido Materno', 'Correo', 'Estado', 'Crear Acta'];
    const tableRows = data.map((item, index) => [
      index + 1,
      item.nombres,
      item.apellidopaterno,
      item.apellidomaterno,
      item.email,
      item.estado ? 'Completado' : 'Cancelado',
      item.estado ? 'Acta cerrada' : 'Pendiente'
    ]);
  
    // Usa la función autoTable de esta forma
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
  
    doc.save('entrevistas.pdf');
  };
  

// Controlador para exportar a Word
export const exportWord = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reservarentrevista');
        const data = result.rows;

        let htmlContent = `<h1>Listado de Entrevistas</h1>`;
        data.forEach(item => {
            htmlContent += `<p>Nombre: ${item.nombres}, Estado: ${item.estado}</p>`;
        });

        const docxBuffer = htmlToDocx.asBlob(htmlContent);
        res.setHeader('Content-Disposition', 'attachment; filename=entrevistas.docx');
        res.send(docxBuffer);
    } catch (error) {
        console.error('Error al exportar a Word:', error.message);
        res.status(500).json({ error: 'Error al exportar a Word' });
    }
};
