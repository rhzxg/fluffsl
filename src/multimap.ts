// multimap.ts
export class MultiMap {
	private map: Map<number, [number, number][]> = new Map();

	add(key: number, [startIndex, endIndex]: [number, number]): void {
		if (!this.map.has(key)) {
			this.map.set(key, []);
		}
		this.map.get(key)!.push([startIndex, endIndex]);
		this.map.get(key)!.sort((a, b) => a[0] - b[0]);
	}

	has(key: number, [startIndex, endIndex]: [number, number]): boolean {
		const intervals = this.map.get(key);
		if (!intervals) {
			return false;
		}

		let left = 0;
		let right = intervals.length - 1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			const [midStart, midEnd] = intervals[mid];

			if (midStart < startIndex) {
				left = mid + 1;
			} else if (midStart > startIndex) {
				right = mid - 1;
			} else {
				if (midEnd >= endIndex) {
					return true;
				} else {
					return false;
				}
			}
		}

		if (left < intervals.length) {
			const [existedStartIndex, existedEndIndex] = intervals[left];
			if (startIndex >= existedStartIndex && endIndex <= existedEndIndex) {
				return true;
			}
		}

		return false;
	}
}
