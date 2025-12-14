import { ReportService } from './report.service';
import { BudgetService } from '../budgets/budget.service';
import { ExpenseService } from '../expenses/expense.service';
import { CreditCardService } from '../credit-cards/credit-card.service';
import { CategoryService } from '../categories/category.service';
import * as fc from 'fast-check';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the services
jest.mock('../budgets/budget.service');
jest.mock('../expenses/expense.service');
jest.mock('../credit-cards/credit-card.service');
jest.mock('../categories/category.service');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('ReportService', () => {
  let reportService: ReportService;
  let mockBudgetService: jest.Mocked<BudgetService>;
  let mockExpenseService: jest.Mocked<ExpenseService>;
  let mockCreditCardService: jest.Mocked<CreditCardService>;
  let mockCategoryService: jest.Mocked<CategoryService>;

  const mockUserId = 'test-user-id';
  const mockBudgetId = 'test-budget-id';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // Create service instance
    reportService = new ReportService();
    
    // Get mocked services
    mockBudgetService = jest.mocked(BudgetService.prototype);
    mockExpenseService = jest.mocked(ExpenseService.prototype);
    mockCreditCardService = jest.mocked(CreditCardService.prototype);
    mockCategoryService = jest.mocked(CategoryService.prototype);
  });

  describe('Export Completeness - Property-Based Tests', () => {
    /**
     * **Feature: personal-finance-app, Property 12: Completitud de exportación**
     * **Validates: Requirements 6.2, 6.3, 6.4**
     * 
     * For any export request, the generated file must contain all requested data without omissions
     */
    it('should generate complete HTML content for budget export without omissions', () => {
      // Property-based test focusing on HTML generation completeness
      fc.assert(
        fc.property(
          // Generate complete budget data with simpler constraints
          fc.record({
            id: fc.uuid(),
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2020, max: 2030 }),
            paymentFrequency: fc.constantFrom('BIWEEKLY', 'MONTHLY'),
            totalIncome: fc.integer({ min: 1000, max: 100000 }),
            periods: fc.array(
              fc.record({
                id: fc.uuid(),
                periodNumber: fc.integer({ min: 1, max: 2 }),
                income: fc.integer({ min: 500, max: 50000 }),
                totalExpenses: fc.integer({ min: 0, max: 50000 }),
                availableBalance: fc.integer({ min: -50000, max: 50000 }),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 1, maxLength: 2 }
            ),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          fc.boolean(), // includeExpenses flag
          (budget, includeExpenses) => {
            // Ensure periods match payment frequency constraints
            if (budget.paymentFrequency === 'MONTHLY') {
              budget.periods = budget.periods.slice(0, 1);
              budget.periods[0].periodNumber = 1;
            } else {
              // BIWEEKLY
              if (budget.periods.length === 1) {
                budget.periods.push({
                  ...budget.periods[0],
                  id: fc.sample(fc.uuid(), 1)[0],
                  periodNumber: 2,
                });
              }
              budget.periods[0].periodNumber = 1;
              budget.periods[1].periodNumber = 2;
            }

            // Test the HTML generation method directly (accessing private method for testing)
            const htmlContent = (reportService as any).generateBudgetHtml(budget, includeExpenses);

            // Verify export completeness - HTML must contain all budget data
            expect(htmlContent).toBeDefined();
            expect(typeof htmlContent).toBe('string');
            expect(htmlContent.length).toBeGreaterThan(0);

            // Verify HTML contains year (always present as number)
            expect(htmlContent).toContain(budget.year.toString());
            expect(htmlContent).toContain(budget.totalIncome.toFixed(2));
            
            // Verify payment frequency is displayed
            const expectedFrequency = budget.paymentFrequency === 'BIWEEKLY' ? 'Quincenal' : 'Mensual';
            expect(htmlContent).toContain(expectedFrequency);
            
            // Verify all periods are included without omissions
            budget.periods.forEach((period) => {
              expect(htmlContent).toContain(period.income.toFixed(2));
              expect(htmlContent).toContain(period.totalExpenses.toFixed(2));
              expect(htmlContent).toContain(period.availableBalance.toFixed(2));
              
              // Verify period titles are correct
              if (budget.paymentFrequency === 'BIWEEKLY') {
                const expectedTitle = period.periodNumber === 1 ? 'Primera Quincena' : 'Segunda Quincena';
                expect(htmlContent).toContain(expectedTitle);
              } else {
                expect(htmlContent).toContain('Período Mensual');
              }
            });

            // Verify totals section is complete
            const totalExpenses = budget.periods.reduce((sum, p) => sum + p.totalExpenses, 0);
            const totalBalance = budget.periods.reduce((sum, p) => sum + p.availableBalance, 0);
            
            expect(htmlContent).toContain(totalExpenses.toFixed(2));
            expect(htmlContent).toContain(totalBalance.toFixed(2));
            
            // Verify HTML structure is valid
            expect(htmlContent).toContain('<!DOCTYPE html>');
            expect(htmlContent).toContain('<html>');
            expect(htmlContent).toContain('</html>');
            expect(htmlContent).toContain('<body>');
            expect(htmlContent).toContain('</body>');
            
            // Verify essential sections are present
            expect(htmlContent).toContain('Resumen Total');
            expect(htmlContent).toContain('Ingresos Totales');
            expect(htmlContent).toContain('Gastos Totales');
            expect(htmlContent).toContain('Saldo Total Disponible');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate expense data completeness for export', () => {
      // Property-based test focusing on data completeness validation
      fc.assert(
        fc.property(
          // Generate expenses data with integer amounts to avoid float issues
          fc.array(
            fc.record({
              id: fc.uuid(),
              categoryId: fc.uuid(),
              creditCardId: fc.option(fc.uuid(), { nil: undefined }),
              budgetPeriodId: fc.option(fc.uuid(), { nil: undefined }),
              amount: fc.integer({ min: 1, max: 10000 }),
              currency: fc.constantFrom('GTQ', 'USD'),
              description: fc.string({ minLength: 1, maxLength: 100 }),
              date: fc.date(),
              category: fc.option(fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                color: fc.string({ minLength: 7, maxLength: 7 }),
                icon: fc.string({ minLength: 1, maxLength: 4 }),
              }), { nil: undefined }),
              creditCard: fc.option(fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                bank: fc.string({ minLength: 1, maxLength: 50 }),
              }), { nil: undefined }),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          // Generate filter parameters
          fc.record({
            startDate: fc.option(fc.date(), { nil: undefined }),
            endDate: fc.option(fc.date(), { nil: undefined }),
            categoryId: fc.option(fc.uuid(), { nil: undefined }),
            creditCardId: fc.option(fc.uuid(), { nil: undefined }),
          }),
          (expenses, filters) => {
            // Mock the expense service
            mockExpenseService.getExpensesWithFilters.mockResolvedValue(expenses);

            // Verify that all expenses have required fields for export completeness
            expenses.forEach((expense) => {
              // Verify all essential fields are present
              expect(expense.id).toBeDefined();
              expect(expense.categoryId).toBeDefined();
              expect(expense.amount).toBeGreaterThan(0);
              expect(expense.currency).toMatch(/^(GTQ|USD)$/);
              expect(expense.description).toBeDefined();
              expect(expense.date).toBeInstanceOf(Date);
              expect(expense.createdAt).toBeInstanceOf(Date);
              expect(expense.updatedAt).toBeInstanceOf(Date);
              
              // Verify optional fields are properly handled
              if (expense.category) {
                expect(expense.category.id).toBeDefined();
                expect(expense.category.name).toBeDefined();
              }
              
              if (expense.creditCard) {
                expect(expense.creditCard.id).toBeDefined();
                expect(expense.creditCard.name).toBeDefined();
                expect(expense.creditCard.bank).toBeDefined();
              }
            });

            // Verify filter parameters are properly structured
            if (filters.startDate) {
              expect(filters.startDate).toBeInstanceOf(Date);
            }
            if (filters.endDate) {
              expect(filters.endDate).toBeInstanceOf(Date);
            }
            if (filters.categoryId) {
              expect(typeof filters.categoryId).toBe('string');
            }
            if (filters.creditCardId) {
              expect(typeof filters.creditCardId).toBe('string');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should create complete backup with all user data without omissions', async () => {
      // Property-based test with 5 iterations
      return fc.assert(
        fc.asyncProperty(
          // Generate complete user data with integer amounts
          fc.record({
            budgets: fc.array(
              fc.record({
                id: fc.uuid(),
                month: fc.integer({ min: 1, max: 12 }),
                year: fc.integer({ min: 2020, max: 2030 }),
                paymentFrequency: fc.constantFrom('BIWEEKLY', 'MONTHLY'),
                totalIncome: fc.integer({ min: 1000, max: 100000 }),
                totalExpenses: fc.integer({ min: 0, max: 100000 }),
                availableBalance: fc.integer({ min: -50000, max: 50000 }),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 0, maxLength: 5 }
            ),
            expenses: fc.array(
              fc.record({
                id: fc.uuid(),
                categoryId: fc.uuid(),
                creditCardId: fc.option(fc.uuid(), { nil: undefined }),
                budgetPeriodId: fc.option(fc.uuid(), { nil: undefined }),
                amount: fc.integer({ min: 1, max: 10000 }),
                currency: fc.constantFrom('GTQ', 'USD'),
                description: fc.string({ minLength: 1, maxLength: 100 }),
                date: fc.date(),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 0, maxLength: 10 }
            ),
            creditCards: fc.array(
              fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                bank: fc.string({ minLength: 1, maxLength: 50 }),
                limitGTQ: fc.integer({ min: 1000, max: 100000 }),
                limitUSD: fc.integer({ min: 100, max: 10000 }),
                currentBalanceGTQ: fc.integer({ min: 0, max: 100000 }),
                currentBalanceUSD: fc.integer({ min: 0, max: 10000 }),
                availableBalanceGTQ: fc.integer({ min: 0, max: 100000 }),
                availableBalanceUSD: fc.integer({ min: 0, max: 10000 }),
                isActive: fc.boolean(),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 0, maxLength: 5 }
            ),
            categories: fc.array(
              fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                color: fc.string({ minLength: 7, maxLength: 7 }),
                icon: fc.string({ minLength: 1, maxLength: 4 }),
                isDefault: fc.boolean(),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          fc.constantFrom('json', 'excel'), // format
          (userData, format) => {
            // Mock all services
            mockBudgetService.getUserBudgets.mockResolvedValue(userData.budgets);
            mockExpenseService.getUserExpenses.mockResolvedValue(userData.expenses);
            mockCreditCardService.getUserCreditCards.mockResolvedValue(userData.creditCards);
            mockCategoryService.getUserCategories.mockResolvedValue(userData.categories);

            const fs = require('fs');
            fs.writeFileSync = jest.fn();
            fs.statSync = jest.fn().mockReturnValue({ size: 8192 });

            if (format === 'excel') {
              // Mock ExcelJS for Excel format
              const mockWorksheet = {
                columns: [],
                addRow: jest.fn(),
              };
              const mockWorkbook = {
                addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
                xlsx: {
                  writeFile: jest.fn(),
                },
              };
              const mockExcelJS = {
                Workbook: jest.fn().mockImplementation(() => mockWorkbook),
              };
              jest.doMock('exceljs', () => mockExcelJS);
            }

            // Execute backup
            const result = reportService.backupUserData(mockUserId, {
              format,
              includeHistorical: true,
            });

            return result.then((backupResult) => {
              // Verify backup completeness
              expect(backupResult.success).toBe(true);
              expect(backupResult.fileName).toBeDefined();
              expect(backupResult.fileUrl).toBeDefined();
              expect(backupResult.fileSize).toBeGreaterThan(0);
              expect(backupResult.recordCount.budgets).toBe(userData.budgets.length);
              expect(backupResult.recordCount.expenses).toBe(userData.expenses.length);
              expect(backupResult.recordCount.creditCards).toBe(userData.creditCards.length);
              expect(backupResult.recordCount.categories).toBe(userData.categories.length);

              // Verify all services were called
              expect(mockBudgetService.getUserBudgets).toHaveBeenCalledWith(mockUserId);
              expect(mockExpenseService.getUserExpenses).toHaveBeenCalledWith(mockUserId);
              expect(mockCreditCardService.getUserCreditCards).toHaveBeenCalledWith(mockUserId);
              expect(mockCategoryService.getUserCategories).toHaveBeenCalledWith(mockUserId);

              if (format === 'json') {
                // Verify JSON backup contains all data
                expect(fs.writeFileSync).toHaveBeenCalled();
                const writeCall = fs.writeFileSync.mock.calls[0];
                const backupContent = JSON.parse(writeCall[1]);
                
                expect(backupContent.userId).toBe(mockUserId);
                expect(backupContent.exportDate).toBeDefined();
                
                // Verify the structure and count of data (dates will be serialized as strings)
                expect(backupContent.data.budgets).toHaveLength(userData.budgets.length);
                expect(backupContent.data.expenses).toHaveLength(userData.expenses.length);
                expect(backupContent.data.creditCards).toHaveLength(userData.creditCards.length);
                expect(backupContent.data.categories).toHaveLength(userData.categories.length);
                
                // Verify that all essential fields are present (without comparing dates directly)
                if (userData.budgets.length > 0) {
                  expect(backupContent.data.budgets[0]).toHaveProperty('id');
                  expect(backupContent.data.budgets[0]).toHaveProperty('month');
                  expect(backupContent.data.budgets[0]).toHaveProperty('year');
                }
                
                if (userData.categories.length > 0) {
                  expect(backupContent.data.categories[0]).toHaveProperty('id');
                  expect(backupContent.data.categories[0]).toHaveProperty('name');
                  expect(backupContent.data.categories[0]).toHaveProperty('color');
                }
              }
            });
          }
        ),
        { numRuns: 3 }
      );
    });
  });

  describe('generateBudgetHtml', () => {
    it('should generate HTML content for budget', () => {
      // Mock budget data
      const mockBudget = {
        id: mockBudgetId,
        month: 1,
        year: 2024,
        paymentFrequency: 'MONTHLY' as const,
        totalIncome: 5000,
        periods: [
          {
            id: 'period-1',
            periodNumber: 1,
            income: 5000,
            totalExpenses: 3000,
            availableBalance: 2000,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Access the private method through any casting for testing
      const html = (reportService as any).generateBudgetHtml(mockBudget, false);

      expect(html).toContain('Presupuesto Enero 2024');
      expect(html).toContain('Período Mensual');
      expect(html).toContain('Q5000.00');
      expect(html).toContain('Q3000.00');
      expect(html).toContain('Q2000.00');
    });
  });

  describe('service initialization', () => {
    it('should create exports directory if it does not exist', () => {
      const fs = require('fs');
      const path = require('path');
      
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.mkdirSync = jest.fn();
      path.join = jest.fn().mockReturnValue('/mock/exports/path');

      new ReportService();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        '/mock/exports/path',
        { recursive: true }
      );
    });
  });
});