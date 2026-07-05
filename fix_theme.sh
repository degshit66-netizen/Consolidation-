for file in src/components/*.tsx; do
  sed -i 's/bg-\[#0f1218\]/bg-white/g' "$file"
  sed -i 's/bg-\[#0a0c10\]/bg-slate-50/g' "$file"
  sed -i 's/border-slate-800/border-slate-200/g' "$file"
  sed -i 's/border-slate-700/border-slate-300/g' "$file"
  sed -i 's/bg-slate-900/bg-slate-50/g' "$file"
  sed -i 's/bg-slate-800/bg-slate-100/g' "$file"
  sed -i 's/text-white/text-slate-900/g' "$file"
  sed -i 's/text-slate-300/text-slate-700/g' "$file"
  sed -i 's/text-slate-400/text-slate-500/g' "$file"
done
