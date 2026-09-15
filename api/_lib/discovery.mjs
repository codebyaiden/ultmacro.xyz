export function confidenceWeightedRating(ratingSum, ratingCount, priorMean = 3, priorWeight = 20) {
  const sum = Number(ratingSum || 0);
  const count = Number(ratingCount || 0);
  return (sum + priorMean * priorWeight) / (count + priorWeight);
}

export function popularScore(strategy) {
  const installs = Math.max(0, Number(strategy.installs || 0));
  const ratings = confidenceWeightedRating(strategy.ratingSum, strategy.ratingCount);
  const reports = Math.max(0, Number(strategy.reportCount || 0));
  return Math.log1p(installs) * 18 + ratings * 12 + Math.log1p(Number(strategy.successfulRuns || 0)) * 4 - Math.log1p(reports) * 8;
}

export function trendingScore(strategy, now = Date.now()) {
  const updated = new Date(strategy.updatedAt || strategy.updated || now).getTime();
  const ageDays = Math.max(0, (now - updated) / 86_400_000);
  const freshness = Math.max(0, 30 - ageDays) * 2;
  const momentum = Number(strategy.momentum || 0);
  const recentInstalls = Number(strategy.recentInstalls || 0);
  const recentRatings = Number(strategy.recentRatings || 0);
  return momentum + recentInstalls * 2 + recentRatings * 5 + freshness;
}

export function relevanceScore(strategy) {
  return Number(strategy.featured ? 1000 : 0) + popularScore(strategy);
}

export function sortStrategies(strategies, sort = 'featured') {
  const items = [...strategies];
  return items.sort((left, right) => {
    if (sort === 'popular') return popularScore(right) - popularScore(left);
    if (sort === 'trending') return trendingScore(right) - trendingScore(left);
    if (sort === 'newest') return new Date(right.updatedAt || right.updated || 0) - new Date(left.updatedAt || left.updated || 0);
    if (sort === 'rating') return confidenceWeightedRating(right.ratingSum, right.ratingCount, 3, 20) - confidenceWeightedRating(left.ratingSum, left.ratingCount, 3, 20);
    return relevanceScore(right) - relevanceScore(left);
  });
}