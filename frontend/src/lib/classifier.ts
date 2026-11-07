/**
 * classifier.ts
 *
 * In-browser Random Forest classifier evaluator.
 * Traverses exported decision trees in pure TypeScript.
 * Uses Math.fround() on input features to match scikit-learn's float32 threshold comparisons.
 */

import { ModelData } from "./types";

/**
 * Predicts class probabilities for a given feature vector.
 * Sums leaf probabilities across all decision trees.
 */
export function predictProba(model: ModelData, features: number[]): number[] {
  const numClasses = model.classes.length;
  const totalProba = new Array<number>(numClasses).fill(0);

  for (let t = 0; t < model.trees.length; t++) {
    const tree = model.trees[t];
    let node = 0;

    // Traverse until reaching a leaf (children_left === -1)
    while (tree.children_left[node] !== -1) {
      const featIdx = tree.feature[node];
      // Compare using float32 precision matching scikit-learn's Tree implementation
      const featVal = Math.fround(features[featIdx]);
      const threshold = tree.threshold[node];

      if (featVal <= threshold) {
        node = tree.children_left[node];
      } else {
        node = tree.children_right[node];
      }
    }

    // Leaf node: accumulate normalized class probabilities
    const leafValue = tree.value[node];
    for (let c = 0; c < numClasses; c++) {
      totalProba[c] += leafValue[c];
    }
  }

  // Normalize across all trees
  const numTrees = model.trees.length;
  if (numTrees > 0) {
    for (let c = 0; c < numClasses; c++) {
      totalProba[c] /= numTrees;
    }
  }

  return totalProba;
}

/**
 * Predicts the winning class label for a given feature vector.
 * Returns classes[argmax], resolving ties in favor of the first index (identical to numpy.argmax).
 */
export function predict(model: ModelData, features: number[]): string {
  const proba = predictProba(model, features);

  let bestIndex = 0;
  let bestProb = proba[0];

  for (let c = 1; c < proba.length; c++) {
    // Strictly greater ensures first index wins ties (numpy argmax contract)
    if (proba[c] > bestProb) {
      bestProb = proba[c];
      bestIndex = c;
    }
  }

  return model.classes[bestIndex];
}

