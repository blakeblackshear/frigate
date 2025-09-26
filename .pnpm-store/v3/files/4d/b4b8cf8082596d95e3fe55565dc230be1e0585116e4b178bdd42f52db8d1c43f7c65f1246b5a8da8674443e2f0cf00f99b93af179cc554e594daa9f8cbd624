/*
 * compute an Exponential Weighted moving average
 * - https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
 *  - heavily inspired from shaka-player
 */

class EWMA {
  public readonly halfLife: number;
  private alpha_: number;
  private estimate_: number;
  private totalWeight_: number;

  //  About half of the estimated value will be from the last |halfLife| samples by weight.
  constructor(halfLife: number, estimate: number = 0, weight: number = 0) {
    this.halfLife = halfLife;
    // Larger values of alpha expire historical data more slowly.
    this.alpha_ = halfLife ? Math.exp(Math.log(0.5) / halfLife) : 0;
    this.estimate_ = estimate;
    this.totalWeight_ = weight;
  }

  sample(weight: number, value: number) {
    const adjAlpha = Math.pow(this.alpha_, weight);
    this.estimate_ = value * (1 - adjAlpha) + adjAlpha * this.estimate_;
    this.totalWeight_ += weight;
  }

  getTotalWeight(): number {
    return this.totalWeight_;
  }

  getEstimate(): number {
    if (this.alpha_) {
      const zeroFactor = 1 - Math.pow(this.alpha_, this.totalWeight_);
      if (zeroFactor) {
        return this.estimate_ / zeroFactor;
      }
    }
    return this.estimate_;
  }
}

export default EWMA;
