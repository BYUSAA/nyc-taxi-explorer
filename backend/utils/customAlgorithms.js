/**
 * CUSTOM ALGORITHMS - MANUAL IMPLEMENTATIONS
 * NO BUILT-IN LIBRARIES USED
 * For assignment requirement: Manual algorithm implementation
 * 
 * This file contains algorithms written from scratch:
 * 1. Merge Sort - O(n log n)
 * 2. Min Heap - O(log n) for priority queue
 * 3. HashMap - O(1) average case
 * 4. Quick Select - O(n) average for finding kth element
 * 5. Statistical functions (mean, median, mode, std dev)
 */

class CustomAlgorithms {
    
    // =========================================
    // 1. MERGE SORT - O(n log n)
    // Used for sorting trips by fare, distance, etc.
    // =========================================
    mergeSort(arr, compareField = null, ascending = true) {
        // Base case: array with 0 or 1 element is already sorted
        if (arr.length <= 1) {
            return arr;
        }
        
        // Divide array into two halves
        const middle = Math.floor(arr.length / 2);
        const left = arr.slice(0, middle);
       