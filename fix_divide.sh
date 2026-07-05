for file in src/components/*.tsx; do
  sed -i 's/divide-slate-800\/50/divide-slate-200/g' "$file"
  sed -i 's/divide-slate-800/divide-slate-200/g' "$file"
  sed -i 's/contentStyle={{ backgroundColor: '"'"'#0f1218'"'"', border: '"'"'1px solid #1e293b'"'"', borderRadius: '"'"'8px'"'"' }}/contentStyle={{ backgroundColor: '"'"'#ffffff'"'"', border: '"'"'1px solid #e2e8f0'"'"', borderRadius: '"'"'8px'"'"' }}/g' "$file"
done
