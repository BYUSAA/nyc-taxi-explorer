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
               const right = arr.slice(middle);
        
        // Recursively sort both halves
        const sortedLeft = this.mergeSort(left, compareField, ascending);
        const sortedRight = this.mergeSort(right, compareField, ascending);
        
        // Merge the sorted halves
        return this.merge(sortedLeft, sortedRight, compareField, ascending);
    }
    
    // Merge helper for merge sort
    merge(left, right, compareField, ascending) {
        const result = [];
        let leftIndex = 0;
        let rightIndex = 0;
        
        while (leftIndex < left.length && rightIndex < right.length) {
            let leftValue, rightValue;
            
            if (compareField) {
                leftValue = left[leftIndex][compareField];
                rightValue = right[rightIndex][compareField];
            } else {
                leftValue = left[leftIndex];
                rightValue = right[rightIndex];
            }
            
            // Handle null/undefined values
            leftValue = leftValue || 0;
            rightValue = rightValue || 0;
            
            if (ascending) {
                if (leftValue <= rightValue) {
                    result.push(left[leftIndex]);
                    leftIndex++;
                } else {
                    result.push(right[rightIndex]);
                    rightIndex++;
                }
            } else {
                if (leftValue >= rightValue) {
                    result.push(left[leftIndex]);
                    leftIndex++;
                } else {
                    result.push(right[rightIndex]);
                    rightIndex++;
                }
            }
        }
        
        // Add remaining elements
        while (leftIndex < left.length) {
            result.push(left[leftIndex]);
            leftIndex++;
        }
        
        while (rightIndex < right.length) {
            result.push(right[rightIndex]);
            rightIndex++;
        }
        
        return result;
    }
    
    // =========================================
    // 2. QUICK SORT - O(n log n) average, O(n²) worst case
    // Alternative sorting algorithm
    // =========================================
    quickSort(arr, compareField = null, ascending = true) {
        if (arr.length <= 1) {
            return arr;
        }
        
        const pivot = arr[Math.floor(arr.length / 2)];
        const left = [];
        const right = [];
        const equal = [];
        
        for (let i = 0; i < arr.length; i++) {
            let pivotValue, currentValue;
            
            if (compareField) {
                pivotValue = pivot[compareField] || 0;
                currentValue = arr[i][compareField] || 0;
            } else {
                pivotValue = pivot;
                currentValue = arr[i];
            }
            
            if (ascending) {
                if (currentValue < pivotValue) {
                    left.push(arr[i]);
                } else if (currentValue > pivotValue) {
                    right.push(arr[i]);
                } else {
                    equal.push(arr[i]);
                }
            } else {
                if (currentValue > pivotValue) {
                    left.push(arr[i]);
                } else if (currentValue < pivotValue) {
                    right.push(arr[i]);
                } else {
                    equal.push(arr[i]);
                }
            }
        }
        
        return [
            ...this.quickSort(left, compareField, ascending),
            ...equal,
            ...this.quickSort(right, compareField, ascending)
        ];
    }
    
    // =========================================
    // 3. MIN HEAP - O(log n) insert/extract
    // Used for finding top K elements efficiently
    // =========================================
    createMinHeap(capacity) {
        return {
            heap: [],
            capacity: capacity || Infinity,
            
            // Insert element into heap
            insert: function(value) {
                if (this.heap.length < this.capacity) {
                    this.heap.push(value);
                    this._bubbleUp(this.heap.length - 1);
                } else if (value > this.heap[0]) {
                    this.heap[0] = value;
                    this._bubbleDown(0);
                }
            },
            
            // Extract minimum element
            extractMin: function() {
                if (this.heap.length === 0) return null;
                if (this.heap.length === 1) return this.heap.pop();
                
                const min = this.heap[0];
                this.heap[0] = this.heap.pop();
                this._bubbleDown(0);
                return min;
            },
            
            // Get minimum element without removing
            peek: function() {
                return this.heap.length > 0 ? this.heap[0] : null;
            },
            
            // Bubble up to maintain heap property
            _bubbleUp: function(index) {
                while (index > 0) {
                    const parent = Math.floor((index - 1) / 2);
                    
                    if (this.heap[parent] <= this.heap[index]) {
                        break;
                    }
                    
                    // Swap
                    const temp = this.heap[parent];
                    this.heap[parent] = this.heap[index];
                    this.heap[index] = temp;
                    
                    index = parent;
                }
            },
            
            // Bubble down to maintain heap property
            _bubbleDown: function(index) {
                const length = this.heap.length;
                
                while (true) {
                    let smallest = index;
                    const left = 2 * index + 1;
                    const right = 2 * index + 2;
                    
                    if (left < length && this.heap[left] < this.heap[smallest]) {
                        smallest = left;
                    }
                    
                    if (right < length && this.heap[right] < this.heap[smallest]) {
                        smallest = right;
                    }
                    
                    if (smallest === index) {
                        break;
                    }
                    
                    // Swap
                    const temp = this.heap[index];
                    this.heap[index] = this.heap[smallest];
                    this.heap[smallest] = temp;
                    
                    index = smallest;
                }
            },
            
            // Get all elements in sorted order
            getSorted: function() {
                // Manual insertion sort for small arrays
                const sorted = [];
                const copy = [...this.heap];
                
                while (copy.length > 0) {
                    let maxIndex = 0;
                    for (let i = 1; i < copy.length; i++) {
                        if (copy[i] > copy[maxIndex]) {
                            maxIndex = i;
                        }
                    }
                    sorted.push(copy[maxIndex]);
                    copy.splice(maxIndex, 1);
                }
                
                return sorted;
            },
            
            // Get size
            size: function() {
                return this.heap.length;
            }
        };
    }
    
    // =========================================
    // 4. MAX HEAP - O(log n) insert/extract
    // =========================================
    createMaxHeap() {
        return {
            heap: [],
            
            insert: function(value) {
                this.heap.push(value);
                this._bubbleUp(this.heap.length - 1);
            },
            
            extractMax: function() {
                if (this.heap.length === 0) return null;
                if (this.heap.length === 1) return this.heap.pop();
                
                const max = this.heap[0];
                this.heap[0] = this.heap.pop();
                this._bubbleDown(0);
                return max;
            },
            
            _bubbleUp: function(index) {
                while (index > 0) {
                    const parent = Math.floor((index - 1) / 2);
                    if (this.heap[parent] >= this.heap[index]) {
                        break;
                    }
                    [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
                    index = parent;
                }
            },
            
            _bubbleDown: function(index) {
                const length = this.heap.length;
                while (true) {
                    let largest = index;
                    const left = 2 * index + 1;
                    const right = 2 * index + 2;
                    
                    if (left < length && this.heap[left] > this.heap[largest]) {
                        largest = left;
                    }
                    if (right < length && this.heap[right] > this.heap[largest]) {
                        largest = right;
                    }
                    if (largest === index) {
                        break;
                    }
                    [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
                    index = largest;
                }
            }
        };
    }
    
    // =========================================
    // 5. HASH MAP - O(1) average
    // Custom implementation for frequency counting
    // =========================================
    createHashMap(initialSize = 1000) {
        return {
            buckets: new Array(initialSize).fill(null).map(() => []),
            size: 0,
            
            // Hash function - polynomial rolling hash
            _hash: function(key) {
                const keyStr = String(key);
                let hash = 0;
                const prime = 31;
                
                for (let i = 0; i < keyStr.length; i++) {
                    hash = (hash * prime + keyStr.charCodeAt(i)) % this.buckets.length;
                }
                
                return hash;
            },
            
            // Insert or update key-value pair
            set: function(key, value) {
                const index = this._hash(key);
                const bucket = this.buckets[index];
                
                // Check if key already exists
                for (let i = 0; i < bucket.length; i++) {
                    if (bucket[i][0] === key) {
                        bucket[i][1] = value;
                        return;
                    }
                }
                
                // Add new key-value pair
                bucket.push([key, value]);
                this.size++;
                
                // Resize if load factor > 0.75
                if (this.size > this.buckets.length * 0.75) {
                    this._resize();
                }
            },
            
            // Get value by key
            get: function(key) {
                const index = this._hash(key);
                const bucket = this.buckets[index];
                
                for (let i = 0; i < bucket.length; i++) {
                    if (bucket[i][0] === key) {
                        return bucket[i][1];
                    }
                }
                
                return null;
            },
            
            // Check if key exists
            has: function(key) {
                return this.get(key) !== null;
            },
            
            // Delete key-value pair
            delete: function(key) {
                const index = this._hash(key);
                const bucket = this.buckets[index];
                
                for (let i = 0; i < bucket.length; i++) {
                    if (bucket[i][0] === key) {
                        bucket.splice(i, 1);
                        this.size--;
                        return true;
                    }
                }
                
                return false;
            },
            
            // Increment value (useful for counting)
            increment: function(key) {
                const current = this.get(key) || 0;
                this.set(key, current + 1);
            },
            
            // Get all entries
            entries: function() {
                const result = [];
                for (let i = 0; i < this.buckets.length; i++) {
                    for (let j = 0; j < this.buckets[i].length; j++) {
                        result.push(this.buckets[i][j]);
                    }
                }
                return result;
            },
            
            // Get all keys
            keys: function() {
                const result = [];
                for (let i = 0; i < this.buckets.length; i++) {
                    for (let j = 0; j < this.buckets[i].length; j++) {
                        result.push(this.buckets[i][j][0]);
                    }
                }
                return result;
            },
            
            // Get all values
            values: function() {
                const result = [];
                for (let i = 0; i < this.buckets.length; i++) {
                    for (let j = 0; j < this.buckets[i].length; j++) {
                        result.push(this.buckets[i][j][1]);
                    }
                }
                return result;
            },
            
            // Resize buckets when load factor is high
            _resize: function() {
                const oldBuckets = this.buckets;
                this.buckets = new Array(oldBuckets.length * 2).fill(null).map(() => []);
                this.size = 0;
                
                for (let i = 0; i < oldBuckets.length; i++) {
                    for (let j = 0; j < oldBuckets[i].length; j++) {
                        const [key, value] = oldBuckets[i][j];
                        this.set(key, value);
                    }
                }
            }
        };
    }
    
    // =========================================
    // 6. BINARY SEARCH - O(log n)
    // =========================================
    binarySearch(arr, target, compareField = null) {
        let left = 0;
        let right = arr.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            
            let midValue, targetValue;
            if (compareField) {
                midValue = arr[mid][compareField];
                targetValue = target[compareField] !== undefined ? target[compareField] : target;
            } else {
                midValue = arr[mid];
                targetValue = target;
            }
            
            if (midValue === targetValue) {
                return mid;
            } else if (midValue < targetValue) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return -1;
    }
    
    // =========================================
    // 7. QUICK SELECT - O(n) average
    // Find kth smallest element
    // =========================================
    quickSelect(arr, k, compareField = null) {
        if (k < 0 || k >= arr.length) {
            return null;
        }
        
        return this._quickSelectHelper(arr, 0, arr.length - 1, k, compareField);
    }
    
    _quickSelectHelper(arr, left, right, k, compareField) {
        if (left === right) {
            return arr[left];
        }
        
        const pivotIndex = this._partition(arr, left, right, compareField);
        
        if (k === pivotIndex) {
            return arr[k];
        } else if (k < pivotIndex) {
            return this._quickSelectHelper(arr, left, pivotIndex - 1, k, compareField);
        } else {
            return this._quickSelectHelper(arr, pivotIndex + 1, right, k, compareField);
        }
    }
    
    _partition(arr, left, right, compareField) {
        const pivot = arr[right];
        let i = left;
        
        for (let j = left; j < right; j++) {
            let pivotValue, currentValue;
            
            if (compareField) {
                pivotValue = pivot[compareField] || 0;
                currentValue = arr[j][compareField] || 0;
            } else {
                pivotValue = pivot;
                currentValue = arr[j];
            }
            
            if (currentValue <= pivotValue) {
                [arr[i], arr[j]] = [arr[j], arr[i]];
                i++;
            }
        }
        
        [arr[i], arr[right]] = [arr[right], arr[i]];
        return i;
    }
    
    // =========================================
    // 8. FIND TOP K ROUTES
    // Combines HashMap and Min Heap for efficiency
    // =========================================
    findTopKRoutes(trips, k = 10) {
        // Use HashMap to count route frequencies
        const routeCounter = this.createHashMap();
        
        for (let i = 0; i < trips.length; i++) {
            const trip = trips[i];
            const routeKey = trip.pickup_location_id + '_' + trip.dropoff_location_id;
            routeCounter.increment(routeKey);
        }
        
        // Use Min Heap to find top K
        const heap = this.createMinHeap(k);
        const routes = routeCounter.entries();
        
        for (let i = 0; i < routes.length; i++) {
            heap.insert(routes[i][1]);
        }
        
        const topCounts = heap.getSorted();
        const result = [];
        
        // Match counts with routes
        for (let i = 0; i < topCounts.length; i++) {
            const count = topCounts[i];
            for (let j = 0; j < routes.length; j++) {
                if (routes[j][1] === count) {
                    const [pickupId, dropoffId] = routes[j][0].split('_').map(Number);
                    result.push({
                        pickup_location_id: pickupId,
                        dropoff_location_id: dropoffId,
                        trip_count: count
                    });
                    routes.splice(j, 1);
                    break;
                }
            }
        }
        
        return result;
    }
    
    // =========================================
    // 9. STATISTICAL FUNCTIONS
    // Manual calculations - no built-in functions
    // =========================================
    
    // Calculate mean
    calculateMean(values) {
        if (values.length === 0) return 0;
        
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
            sum += values[i];
        }
        
        return sum / values.length;
    }
    
    // Calculate median
    calculateMedian(values) {
        if (values.length === 0) return 0;
        
        // Need to sort first - use our merge sort
        const sorted = this.mergeSort(
            values.map(v => ({ value: v })),
            'value'
        ).map(item => item.value);
        
        const mid = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
            return sorted[mid];
        }
    }
    
    // Calculate mode
    calculateMode(values) {
        if (values.length === 0) return null;
        
        const frequency = {};
        let maxFreq = 0;
        let mode = values[0];
        
        for (let i = 0; i < values.length; i++) {
            const val = values[i];
            frequency[val] = (frequency[val] || 0) + 1;
            
            if (frequency[val] > maxFreq) {
                maxFreq = frequency[val];
                mode = val;
            }
        }
        
        return mode;
    }
    
    // Calculate standard deviation
    calculateStdDev(values) {
        if (values.length === 0) return 0;
        
        const mean = this.calculateMean(values);
        let sumSquaredDiff = 0;
        
        for (let i = 0; i < values.length; i++) {
            const diff = values[i] - mean;
            sumSquaredDiff += diff * diff;
        }
        
        return Math.sqrt(sumSquaredDiff / values.length);
    }
    
    // Calculate percentile
    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sorted[lower];
        }
        
        return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
    }
    
    // Calculate correlation coefficient
    calculateCorrelation(xValues, yValues) {
        if (xValues.length !== yValues.length || xValues.length === 0) {
            return 0;
        }
        
        const n = xValues.length;
        const meanX = this.calculateMean(xValues);
        const meanY = this.calculateMean(yValues);
        
        let numerator = 0;
        let denomX = 0;
        let denomY = 0;
        
        for (let i = 0; i < n; i++) {
            const diffX = xValues[i] - meanX;
            const diffY = yValues[i] - meanY;
            
            numerator += diffX * diffY;
            denomX += diffX * diffX;
            denomY += diffY * diffY;
        }
        
        if (denomX === 0 || denomY === 0) return 0;
        
        return numerator / Math.sqrt(denomX * denomY);
    }
    
    // =========================================
    // 10. LINEAR REGRESSION
    // =========================================
    linearRegression(xValues, yValues) {
        if (xValues.length !== yValues.length || xValues.length === 0) {
            return null;
        }
        
        const n = xValues.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += xValues[i];
            sumY += yValues[i];
            sumXY += xValues[i] * yValues[i];
            sumX2 += xValues[i] * xValues[i];
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate R-squared
        const meanY = sumY / n;
        let totalSS = 0, residualSS = 0;
        
        for (let i = 0; i < n; i++) {
            const predicted = slope * xValues[i] + intercept;
            totalSS += (yValues[i] - meanY) ** 2;
            residualSS += (yValues[i] - predicted) ** 2;
        }
        
        const rSquared = 1 - (residualSS / totalSS);
        
        return {
            slope,
            intercept,
            rSquared,
            predict: (x) => slope * x + intercept
        };
    }
    
    // =========================================
    // 11. DETECT OUTLIERS - IQR method
    // =========================================
    detectOutliers(values) {
        if (values.length < 4) return [];
        
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = this.calculatePercentile(sorted, 25);
        const q3 = this.calculatePercentile(sorted, 75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outliers = [];
        for (let i = 0; i < values.length; i++) {
            if (values[i] < lowerBound || values[i] > upperBound) {
                outliers.push(values[i]);
            }
        }
        
        return outliers;
    }
    
    // =========================================
    // 12. K-MEANS CLUSTERING (Simplified)
    // For grouping similar trips
    // =========================================
    kMeansClustering(points, k, maxIterations = 100) {
        if (points.length < k) return null;
        
        // Initialize centroids randomly
        let centroids = [];
        const usedIndices = new Set();
        
        while (centroids.length < k) {
            const index = Math.floor(Math.random() * points.length);
            if (!usedIndices.has(index)) {
                usedIndices.add(index);
                centroids.push({ ...points[index] });
            }
        }
        
        let clusters = new Array(points.length).fill(-1);
        let changed = true;
        let iterations = 0;
        
        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;
            
            // Assign points to nearest centroid
            for (let i = 0; i < points.length; i++) {
                let minDist = Infinity;
                let newCluster = -1;
                
                for (let j = 0; j < centroids.length; j++) {
                    const dist = this._euclideanDistance(points[i], centroids[j]);
                    if (dist < minDist) {
                        minDist = dist;
                        newCluster = j;
                    }
                }
                
                if (clusters[i] !== newCluster) {
                    clusters[i] = newCluster;
                    changed = true;
                }
            }
            
            // Update centroids
            if (changed) {
                const newCentroids = new Array(k).fill(null).map(() => ({
                    sumX: 0,
                    sumY: 0,
                    count: 0
                }));
                
                for (let i = 0; i < points.length; i++) {
                    const cluster = clusters[i];
                    newCentroids[cluster].sumX += points[i].x || 0;
                    newCentroids[cluster].sumY += points[i].y || 0;
                    newCentroids[cluster].count++;
                }
                
                for (let j = 0; j < k; j++) {
                    if (newCentroids[j].count > 0) {
                        centroids[j] = {
                            x: newCentroids[j].sumX / newCentroids[j].count,
                            y: newCentroids[j].sumY / newCentroids[j].count
                        };
                    }
                }
            }
        }
        
        return { clusters, centroids };
    }
    
    _euclideanDistance(a, b) {
        const dx = (a.x || 0) - (b.x || 0);
        const dy = (a.y || 0) - (b.y || 0);
        return Math.sqrt(dx * dx + dy * dy);
    }
}

module.exports = new CustomAlgorithms();