for file in src/components/*.tsx; do
  sed -i 's/bg-blue-600 hover:bg-blue-700 text-slate-900/bg-blue-600 hover:bg-blue-700 text-white/g' "$file"
  sed -i 's/bg-blue-600 text-slate-900/bg-blue-600 text-white/g' "$file"
  sed -i 's/disabled:opacity-50 disabled:cursor-not-allowed text-slate-900/disabled:opacity-50 disabled:cursor-not-allowed text-white/g' "$file"
done
