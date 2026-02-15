/**
 * CUSTOM ALGORITHMS - MANUAL IMPLEMENTATIONS
 * No built-in functions like sort(), Math.max(), etc.
 */

class CustomAlgorithms {
    
    // =========================================
    // 1. MERGE SORT - O(n log n)
    // =========================================
    mergeSort(arr, compareField) {
        if (arr.length <= 1) {
            return arr;
        }
        
        const middle = Math.floor(arr.length / 2);
        const left = arr.slice(0, middle);
        const right = arr.slice(middle);
        
        const sortedLeft = this.mergeSort(left, compareField);
        const sortedRight = this.mergeSort(right, compareField);
        
        return this.merge(sortedLeft, sortedRight, compareField);
    }
    
    merge(left, right, compareField) {
        const result = [];
        let leftIndex = 0;
        let rightIndex = 0;
        
        while (leftIndex < left.length && rightIndex < right.length) {
            const leftValue = left[leftIndex][compareField] || 0;
            const rightValue = right[rightIndex][compareField] || 0;
            
            if (leftValue <= rightValue) {
                result.push(left[leftIndex]);
                leftIndex++;
            } else {
                result.push(right[rightIndex]);
                rightIndex++;
            }
        }
        
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
    // 2. QUICK SORT - O(n log n) average
    // =========================================
    quickSort(arr, compareField) {
        if (arr.length <= 1) {
            return arr;
        }
        
        const pivot = arr[Math.floor(arr.length / 2)];
        const left = [];
        const right = [];
        const equal = [];
        
        for (let i = 0; i < arr.length; i++) {
            const value = arr[i][compareField] || 0;
            const pivotValue = pivot[compareField] || 0;
            
            if (value < pivotValue) {
                left.push(arr[i]);
            } else if (value > pivotValue) {
                right.push(arr[i]);
            } else {
                equal.push(arr[i]);
            }
        }
        
        return [
            ...this.quickSort(left, compareField),
            ...equal,
            ...this.quickSort(right, compareField)
        ];
    }
    
    // =========================================
    // 3. MIN HEAP - O(log n) for insert/extract
    // =========================================
    createMinHeap(capacity) {
        return {
            heap: [],
            capacity: capacity,
            
            insert: function(value) {
                if (this.heap.length < this.capacity) {
                    this.heap.push(value);
                    this._bubbleUp(this.heap.length - 1);
                } else if (value > this.heap[0]) {
                    this.heap[0] = value;
                    this._bubbleDown(0);
                }
            },
            
            _bubbleUp: function(index) {
                while (index > 0) {
                    const parent = Math.floor((index - 1) / 2);
                    if (this.heap[parent] <= this.heap[index]) {
                        break;
                    }
                    [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
                    index = parent;
                }
            },
            
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
                    [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                    index = smallest;
                }
            },
            
            getSorted: function() {
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
            }
        };
    }
    
    // =========================================
    // 4. MAX HEAP - O(log n) for insert/extract
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
    // =========================================
    createHashMap(initialSize = 1000) {
        return {
            buckets: new Array(initialSize).fill(null).map(() => []),
            size: 0,
            
            hash: function(key) {
                const keyStr = String(key);
                let hash = 0;
                for (let i = 0; i < keyStr.length; i++) {
                    hash = ((hash << 5) - hash) + keyStr.charCodeAt(i);
                    hash = hash & hash;
                }
                return Math.abs(hash) % this.buckets.length;
            },
            
            set: function(key, value) {
                const index = this.hash(key);
                const bucket = this.buckets[index];
                
                for (let i = 0; i < bucket.length; i++) {
                    if (bucket[i][0] === key) {
                        bucket[i][1] = value;
                        return;
                    }
                }
                
                bucket.push([key, value]);
                this.size++;
            },
            
            get: function(key) {
                const index = this.hash(key);
                const bucket = this.buckets[index];
                
                for (let i = 0; i < bucket.length; i++) {
                    if (bucket[i][0] === key) {
                        return bucket[i][1];
                    }
                }
                return null;
            },
            
            delete: function(key) {
                const index = this.hash(key);
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
            
            has: function(key) {
                return this.get(key) !== null;
            },
            
            increment: function(key) {
                const current = this.get(key) || 0;
                this.set(key, current + 1);
            },
            
            entries: function() {
                const result = [];
                for (let i = 0; i < this.buckets.length; i++) {
                    for (let j = 0; j < this.buckets[i].length; j++) {
                        result.push(this.buckets[i][j]);
                    }
                }
                return result;
            }
        };
    }
    
    // =========================================
    // 6. BINARY SEARCH - O(log n)
    // =========================================
    binarySearch(arr, target, compareField) {
        let left = 0;
        let right = arr.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midValue = arr[mid][compareField] || 0;
            
            if (midValue === target) {
                return mid;
            } else if (midValue < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return -1;
    }
    
    // =========================================
    // 7. STATISTICS - Manual calculations
    // =========================================
    calculateMean(values) {
        if (values.length === 0) return 0;
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
            sum += values[i];
        }
        return sum / values.length;
    }
    
    calculateMedian(values) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
            return sorted[mid];
        }
    }
    
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
    
    // =========================================
    // 8. FIND TOP K ROUTES
    // =========================================
    findTopKRoutes(trips, k = 10) {
        const routeCounter = this.createHashMap();
        
        for (let i = 0; i < trips.length; i++) {
            const trip = trips[i];
            const routeKey = trip.pickup_location_id + '_' + trip.dropoff_location_id;
            routeCounter.increment(routeKey);
        }
        
        const heap = this.createMinHeap(k);
        const routes = routeCounter.entries();
        
        for (let i = 0; i < routes.length; i++) {
            heap.insert(routes[i][1]);
        }
        
        const topCounts = heap.getSorted();
        const result = [];
        
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
    // 9. DETECT OUTLIERS - IQR method
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
    // 10. LINEAR REGRESSION - Manual calculation
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
}

module.exports = new CustomAlgorithms();