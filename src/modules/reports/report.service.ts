import * as fs from 'fs';
import * as path from 'path';

import { BudgetService } from '../budgets/budget.service';
import { ExpenseService } from '../expenses/expense.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { CategoryService } from '../categories/category.service';

import {
  ExportBudgetPdfDto,
  ExportExpensesExcelDto,
  GenerateBudgetImageDto,
  BackupDataDto,
  ExportResponse,
  BudgetImageResponse,
  BackupResponse,
} from './report.types';

export class ReportService {
  private budgetService: BudgetService;
  private expenseService: ExpenseService;
  private creditCardService: CreditCardService;
  private categoryService: CategoryService;
  private exportsDir: string;

  constructor() {
    this.budgetService = new BudgetService();
    this.expenseService = new ExpenseService();
    this.creditCardService = new CreditCardService();
    this.categoryService = new CategoryService();
    
    // Create exports directory if it doesn't exist
    this.exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  async exportBudgetToPdf(userId: string, data: ExportBudgetPdfDto): Promise<ExportResponse> {
    try {
      // Dynamic import to avoid issues in test environment
      const puppeteer = await import('puppeteer');
      
      // Get budget data
      const budget = await this.budgetService.getBudgetById(data.budgetId, userId);
      
      // Generate HTML content for the budget
      const htmlContent = this.generateBudgetHtml(budget, data.includeExpenses || false);
      
      // Generate PDF using Puppeteer
      const browser = await puppeteer.default.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const fileName = `budget_${budget.month}_${budget.year}_${Date.now()}.pdf`;
      const filePath = path.join(this.exportsDir, fileName);
      
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });
      
      await browser.close();
      
      const stats = fs.statSync(filePath);
      
      return {
        success: true,
        fileName,
        fileUrl: `/exports/${fileName}`,
        fileSize: stats.size,
        mimeType: 'application/pdf',
      };
    } catch (error) {
      console.error('Error exporting budget to PDF:', error);
      throw new Error('Failed to export budget to PDF');
    }
  }

  async exportExpensesToExcel(userId: string, data: ExportExpensesExcelDto): Promise<ExportResponse> {
    try {
      // Dynamic import to avoid issues in test environment
      const ExcelJS = await import('exceljs');
      
      // Get expenses data with filters
      const expenses = await this.expenseService.getExpensesWithFilters(userId, {
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        categoryId: data.categoryId,
        creditCardId: data.creditCardId,
      });

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Gastos');

      // Add headers
      worksheet.columns = [
        { header: 'Fecha', key: 'date', width: 15 },
        { header: 'Descripción', key: 'description', width: 30 },
        { header: 'Monto', key: 'amount', width: 15 },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Tarjeta de Crédito', key: 'creditCard', width: 25 },
      ];

      // Add data rows
      expenses.forEach((expense) => {
        worksheet.addRow({
          date: expense.date.toLocaleDateString(),
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category?.name || 'Sin categoría',
          creditCard: expense.creditCard?.name || 'N/A',
        });
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Generate file
      const fileName = `expenses_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportsDir, fileName);
      
      await workbook.xlsx.writeFile(filePath);
      
      const stats = fs.statSync(filePath);
      
      return {
        success: true,
        fileName,
        fileUrl: `/exports/${fileName}`,
        fileSize: stats.size,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    } catch (error) {
      console.error('Error exporting expenses to Excel:', error);
      throw new Error('Failed to export expenses to Excel');
    }
  }

  async generateBudgetImage(userId: string, data: GenerateBudgetImageDto): Promise<BudgetImageResponse> {
    try {
      // Dynamic import to avoid issues in test environment
      const { createCanvas } = await import('canvas');
      
      // Get budget data
      const budget = await this.budgetService.getBudgetById(data.budgetId, userId);
      
      // Set canvas dimensions
      const width = data.width || 800;
      const height = data.height || 600;
      const format = data.format || 'png';
      
      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Set background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // Draw budget content
      this.drawBudgetOnCanvas(ctx, budget, width, height);
      
      // Generate file
      const fileName = `budget_image_${budget.month}_${budget.year}_${Date.now()}.${format}`;
      const filePath = path.join(this.exportsDir, fileName);
      
      const buffer = format === 'png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg');
      fs.writeFileSync(filePath, buffer);
      
      return {
        success: true,
        imageUrl: `/exports/${fileName}`,
        imageSize: buffer.length,
        format,
      };
    } catch (error) {
      console.error('Error generating budget image:', error);
      throw new Error('Failed to generate budget image');
    }
  }

  async backupUserData(userId: string, data: BackupDataDto): Promise<BackupResponse> {
    try {
      // Get all user data
      const [budgets, expenses, creditCards, categories] = await Promise.all([
        this.budgetService.getUserBudgets(userId),
        this.expenseService.getUserExpenses(userId),
        this.creditCardService.getUserCreditCards(userId),
        this.categoryService.getUserCategories(userId),
      ]);

      const backupData = {
        exportDate: new Date().toISOString(),
        userId,
        data: {
          budgets,
          expenses,
          creditCards,
          categories,
        },
      };

      const format = data.format || 'json';
      const fileName = `backup_${userId}_${Date.now()}.${format}`;
      const filePath = path.join(this.exportsDir, fileName);

      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      } else {
        // Export to Excel format
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        
        // Add budgets sheet
        const budgetsSheet = workbook.addWorksheet('Presupuestos');
        if (budgets.length > 0) {
          budgetsSheet.columns = Object.keys(budgets[0]).map(key => ({ header: key, key, width: 15 }));
          budgets.forEach(budget => budgetsSheet.addRow(budget));
        }
        
        // Add expenses sheet
        const expensesSheet = workbook.addWorksheet('Gastos');
        if (expenses.length > 0) {
          expensesSheet.columns = Object.keys(expenses[0]).map(key => ({ header: key, key, width: 15 }));
          expenses.forEach(expense => expensesSheet.addRow(expense));
        }
        
        // Add credit cards sheet
        const cardsSheet = workbook.addWorksheet('Tarjetas');
        if (creditCards.length > 0) {
          cardsSheet.columns = Object.keys(creditCards[0]).map(key => ({ header: key, key, width: 15 }));
          creditCards.forEach(card => cardsSheet.addRow(card));
        }
        
        // Add categories sheet
        const categoriesSheet = workbook.addWorksheet('Categorías');
        if (categories.length > 0) {
          categoriesSheet.columns = Object.keys(categories[0]).map(key => ({ header: key, key, width: 15 }));
          categories.forEach(category => categoriesSheet.addRow(category));
        }
        
        await workbook.xlsx.writeFile(filePath);
      }

      const stats = fs.statSync(filePath);

      return {
        success: true,
        fileName,
        fileUrl: `/exports/${fileName}`,
        fileSize: stats.size,
        recordCount: {
          budgets: budgets.length,
          expenses: expenses.length,
          creditCards: creditCards.length,
          categories: categories.length,
        },
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  private generateBudgetHtml(budget: any, includeExpenses: boolean): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Presupuesto ${monthNames[budget.month - 1]} ${budget.year}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .period { margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; }
          .period-title { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
          .amount { text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Presupuesto ${monthNames[budget.month - 1]} ${budget.year}</h1>
          <p>Frecuencia de Pago: ${budget.paymentFrequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'}</p>
        </div>
    `;

    budget.periods.forEach((period: any) => {
      html += `
        <div class="period">
          <div class="period-title">
            ${budget.paymentFrequency === 'BIWEEKLY' ? 
              (period.periodNumber === 1 ? 'Primera Quincena' : 'Segunda Quincena') : 
              'Período Mensual'}
          </div>
          <table>
            <tr>
              <th>Concepto</th>
              <th class="amount">Monto</th>
            </tr>
            <tr>
              <td>Ingresos</td>
              <td class="amount">Q${period.income.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Gastos Totales</td>
              <td class="amount">Q${period.totalExpenses.toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Saldo Disponible</td>
              <td class="amount">Q${period.availableBalance.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      `;
    });

    html += `
        <div class="period">
          <div class="period-title">Resumen Total</div>
          <table>
            <tr>
              <th>Concepto</th>
              <th class="amount">Monto</th>
            </tr>
            <tr>
              <td>Ingresos Totales</td>
              <td class="amount">Q${budget.totalIncome.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Gastos Totales</td>
              <td class="amount">Q${budget.periods.reduce((sum: number, p: any) => sum + p.totalExpenses, 0).toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Saldo Total Disponible</td>
              <td class="amount">Q${budget.periods.reduce((sum: number, p: any) => sum + p.availableBalance, 0).toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private drawBudgetOnCanvas(ctx: any, budget: any, width: number, height: number): void {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Set font and colors
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px Arial';
    
    // Draw title
    const title = `Presupuesto ${monthNames[budget.month - 1]} ${budget.year}`;
    const titleWidth = ctx.measureText(title).width;
    ctx.fillText(title, (width - titleWidth) / 2, 40);
    
    // Draw frequency
    ctx.font = '16px Arial';
    const frequency = `Frecuencia: ${budget.paymentFrequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'}`;
    const freqWidth = ctx.measureText(frequency).width;
    ctx.fillText(frequency, (width - freqWidth) / 2, 70);
    
    // Draw periods
    let yPos = 120;
    const periodHeight = 150;
    
    budget.periods.forEach((period: any, index: number) => {
      // Period title
      ctx.font = 'bold 18px Arial';
      const periodTitle = budget.paymentFrequency === 'BIWEEKLY' ? 
        (period.periodNumber === 1 ? 'Primera Quincena' : 'Segunda Quincena') : 
        'Período Mensual';
      ctx.fillText(periodTitle, 50, yPos);
      
      // Period data
      ctx.font = '14px Arial';
      ctx.fillText(`Ingresos: Q${period.income.toFixed(2)}`, 50, yPos + 30);
      ctx.fillText(`Gastos: Q${period.totalExpenses.toFixed(2)}`, 50, yPos + 50);
      
      // Highlight available balance
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = period.availableBalance >= 0 ? '#008000' : '#FF0000';
      ctx.fillText(`Saldo: Q${period.availableBalance.toFixed(2)}`, 50, yPos + 80);
      ctx.fillStyle = '#333333';
      
      yPos += periodHeight;
    });
    
    // Draw total summary
    const totalIncome = budget.totalIncome;
    const totalExpenses = budget.periods.reduce((sum: number, p: any) => sum + p.totalExpenses, 0);
    const totalBalance = budget.periods.reduce((sum: number, p: any) => sum + p.availableBalance, 0);
    
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Resumen Total:', 50, yPos + 20);
    
    ctx.font = '16px Arial';
    ctx.fillText(`Ingresos Totales: Q${totalIncome.toFixed(2)}`, 50, yPos + 50);
    ctx.fillText(`Gastos Totales: Q${totalExpenses.toFixed(2)}`, 50, yPos + 70);
    
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = totalBalance >= 0 ? '#008000' : '#FF0000';
    ctx.fillText(`Saldo Total: Q${totalBalance.toFixed(2)}`, 50, yPos + 100);
  }
}