export function americanToDecimal(odds: number) {
  if (!Number.isFinite(odds) || odds === 0) {
    return null;
  }

  if (odds > 0) {
    return 1 + odds / 100;
  }

  return 1 + 100 / Math.abs(odds);
}

export function decimalToImplied(decimal: number) {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    return null;
  }

  return 1 / decimal;
}

export function americanToImplied(odds: number) {
  const decimal = americanToDecimal(odds);
  return decimal ? decimalToImplied(decimal) : null;
}

export function stripVig(probabilities: number[]) {
  const valid = probabilities.filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) {
    return [];
  }

  const total = valid.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return [];
  }

  return valid.map((value) => value / total);
}

export function calculateEV(args: {
  offeredOddsAmerican: number;
  modelProbability: number;
}) {
  const decimal = americanToDecimal(args.offeredOddsAmerican);
  if (!decimal || !Number.isFinite(args.modelProbability)) {
    return null;
  }

  return (args.modelProbability * decimal - 1) * 100;
}

export function kellySize(args: {
  offeredOddsAmerican: number;
  modelProbability: number;
}) {
  const decimal = americanToDecimal(args.offeredOddsAmerican);
  if (!decimal || !Number.isFinite(args.modelProbability)) {
    return null;
  }

  const b = decimal - 1;
  const p = args.modelProbability;
  const q = 1 - p;
  if (b <= 0 || p <= 0 || p >= 1) {
    return null;
  }

  const fraction = (b * p - q) / b;
  if (!Number.isFinite(fraction)) {
    return null;
  }

  return Math.max(0, fraction) * 100;
}
