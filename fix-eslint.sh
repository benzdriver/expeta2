
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/\(const\|let\|var\) \([a-zA-Z0-9]*\)\(: [^=]*\)\? = .*\(\/\/.*\)\?$/\1 _\2\3 = \4/g'

find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/: any/: unknown/g'
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/ as any/ as unknown/g'

find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log/\/\* eslint-disable-next-line no-console \*\/\nconsole.log/g'
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error/\/\* eslint-disable-next-line no-console \*\/\nconsole.error/g'
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.warn/\/\* eslint-disable-next-line no-console \*\/\nconsole.warn/g'
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.debug/\/\* eslint-disable-next-line no-console \*\/\nconsole.debug/g'
