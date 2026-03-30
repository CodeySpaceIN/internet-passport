function hashToBits(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  const bits: boolean[] = [];
  for (let index = 0; index < 121; index += 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    bits.push((hash & 1) === 1);
  }
  return bits;
}

export function TrustCardShareQr({ value }: { value: string }) {
  const bits = hashToBits(value);
  return (
    <div className="inline-grid grid-cols-11 gap-[2px] rounded-xl border border-slate-300 bg-white p-2">
      {bits.map((bit, index) => (
        <span key={`${value}-${index}`} className={`h-2.5 w-2.5 rounded-[2px] ${bit ? "bg-slate-900" : "bg-slate-100"}`} />
      ))}
    </div>
  );
}
