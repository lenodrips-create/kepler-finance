// Sample personal-finance data for the dashboard (edit freely).
export const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
export const REVENUE = [7200, 7900, 8100, 8800, 9300, 9100, 10200, 10900, 11400, 11800, 11880, 12840];
export const ALLOC: [string, number][] = [
  ["US stocks", 46],
  ["Index funds", 28],
  ["Bonds", 12],
  ["Crypto", 8],
  ["Cash", 6],
];
export const ACCOUNTS: [string, string, number][] = [
  ["Brokerage", "Taxable", 24100],
  ["Roth IRA", "Retirement", 15200],
  ["High-yield savings", "Cash", 8960],
];
export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
