// multimap.ts
export class MultiMap {
	private map = new Map<number, [number, number][]>();

	add(key: number, [start, end]: [number, number]): void {
		if (!this.map.has(key)) {
			this.map.set(key, [[start, end]]);
			return;
		}

		let intervals = this.map.get(key)!;
		intervals.push([start, end]);
		intervals.sort((a, b) => a[0] - b[0]);

		let merged: [number, number][] = [];
		for (let [s, e] of intervals) {
			if (!merged.length || merged[merged.length - 1][1] < s) {
				merged.push([s, e]);
			} else {
				merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
			}
		}
		this.map.set(key, merged);
	}

	has(key: number, [start, end]: [number, number]): boolean {
		const intervals = this.map.get(key);
		if (!intervals) return false;

		let left = 0;
		let right = intervals.length - 1;

		while (left <= right) {
			const mid = (left + right) >> 1;
			const [s, e] = intervals[mid];
			if (s <= start && e >= end) {
				return true;
			} else if (s > start) {
				right = mid - 1;
			} else {
				left = mid + 1;
			}
		}

		return false;
	}
}
