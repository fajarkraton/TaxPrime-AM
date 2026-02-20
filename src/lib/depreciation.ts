/**
 * Asset Depreciation Calculator
 * Method: Double Declining Balance (DDB) with switch to Straight-Line
 * 
 * Sesuai standar akuntansi PSAK 16 / IAS 16:
 * - DDB Rate = 2 / Useful Life
 * - Setiap tahun: Penyusutan = Nilai Buku Awal × DDB Rate
 * - Switch ke Straight-Line jika SL menghasilkan nilai lebih besar
 * - Nilai buku tidak boleh turun di bawah Salvage Value
 */

export interface DepreciationConfig {
    /** Default useful life by category (years) */
    usefulLifeByCategory: Record<string, number>;
    /** Salvage value percentage (of purchase price) */
    salvageValuePercent: number;
}

export const DEFAULT_DEPRECIATION_CONFIG: DepreciationConfig = {
    usefulLifeByCategory: {
        laptop: 4,
        computer: 5,
        desktop: 5,
        monitor: 6,
        printer: 5,
        networking: 7,
        server: 7,
        phone: 3,
        tablet: 3,
        furniture: 10,
        vehicle: 8,
        other: 5,
    },
    salvageValuePercent: 10,
};

export interface YearSchedule {
    year: number;
    beginningBookValue: number;
    depreciationExpense: number;
    endingBookValue: number;
    method: 'DDB' | 'SL'; // Which method was used this year
}

export interface DepreciationResult {
    purchasePrice: number;
    salvageValue: number;
    usefulLife: number;
    ddbRate: number;
    annualDepreciation: number;      // Current year's depreciation
    monthlyDepreciation: number;     // Current year's monthly estimate
    totalDepreciation: number;
    currentBookValue: number;
    ageInMonths: number;
    ageInYears: number;
    depreciationPercent: number;
    isFullyDepreciated: boolean;
    method: 'DDB';
    yearlySchedule: YearSchedule[];
}

/**
 * Calculate Double Declining Balance depreciation for an asset.
 * Switches to Straight-Line when SL produces a larger depreciation amount.
 */
export function calculateDepreciation(
    purchasePrice: number,
    purchaseDate: Date,
    category: string,
    config: DepreciationConfig = DEFAULT_DEPRECIATION_CONFIG,
): DepreciationResult {
    const usefulLife = config.usefulLifeByCategory[category.toLowerCase()] || config.usefulLifeByCategory['other'];
    const salvageValue = purchasePrice * (config.salvageValuePercent / 100);
    const depreciableAmount = purchasePrice - salvageValue;
    const ddbRate = 2 / usefulLife;

    // Build yearly schedule
    const yearlySchedule: YearSchedule[] = [];
    let bookValue = purchasePrice;

    for (let year = 1; year <= usefulLife; year++) {
        if (bookValue <= salvageValue) break;

        const ddbDepreciation = bookValue * ddbRate;
        const remainingYears = usefulLife - year + 1;
        const slDepreciation = (bookValue - salvageValue) / remainingYears;

        // Switch to SL when it gives a larger or equal amount
        let expense: number;
        let methodUsed: 'DDB' | 'SL';

        if (slDepreciation >= ddbDepreciation) {
            expense = slDepreciation;
            methodUsed = 'SL';
        } else {
            expense = ddbDepreciation;
            methodUsed = 'DDB';
        }

        // Don't go below salvage value
        if (bookValue - expense < salvageValue) {
            expense = bookValue - salvageValue;
        }

        yearlySchedule.push({
            year,
            beginningBookValue: Math.round(bookValue),
            depreciationExpense: Math.round(expense),
            endingBookValue: Math.round(bookValue - expense),
            method: methodUsed,
        });

        bookValue -= expense;
    }

    // Calculate age
    const now = new Date();
    const ageInMonths = Math.max(0,
        (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
        (now.getMonth() - purchaseDate.getMonth())
    );
    const ageInYears = ageInMonths / 12;

    // Determine current year index (0-based)
    const currentYearIndex = Math.min(Math.floor(ageInYears), yearlySchedule.length - 1);

    // Total depreciation = sum of completed years + prorated current year
    let totalDepreciation = 0;
    const completedYears = Math.floor(ageInYears);

    for (let i = 0; i < Math.min(completedYears, yearlySchedule.length); i++) {
        totalDepreciation += yearlySchedule[i].depreciationExpense;
    }

    // Add prorated current year depreciation (by months elapsed in current year)
    if (completedYears < yearlySchedule.length) {
        const monthsInCurrentYear = ageInMonths - (completedYears * 12);
        const proratedAmount = (yearlySchedule[completedYears].depreciationExpense / 12) * monthsInCurrentYear;
        totalDepreciation += proratedAmount;
    }

    totalDepreciation = Math.min(totalDepreciation, depreciableAmount);
    const currentBookValue = Math.max(salvageValue, purchasePrice - totalDepreciation);
    const isFullyDepreciated = ageInYears >= usefulLife;

    // Current year's annual depreciation (for display)
    const annualDepreciation = currentYearIndex >= 0 && currentYearIndex < yearlySchedule.length
        ? yearlySchedule[currentYearIndex].depreciationExpense
        : 0;
    const monthlyDepreciation = annualDepreciation / 12;

    const depreciationPercent = depreciableAmount > 0
        ? Math.min(100, Math.round((totalDepreciation / depreciableAmount) * 100))
        : 0;

    return {
        purchasePrice,
        salvageValue: Math.round(salvageValue),
        usefulLife,
        ddbRate: Math.round(ddbRate * 100) / 100,
        annualDepreciation: Math.round(annualDepreciation),
        monthlyDepreciation: Math.round(monthlyDepreciation),
        totalDepreciation: Math.round(totalDepreciation),
        currentBookValue: Math.round(currentBookValue),
        ageInMonths,
        ageInYears: Math.round(ageInYears * 10) / 10,
        depreciationPercent,
        isFullyDepreciated,
        method: 'DDB',
        yearlySchedule,
    };
}
