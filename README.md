cd /Users/francescomiragliuolo/Desktop/filo
git init
git add .
git commit -m "Initial commit"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/pillsofconstitutionalaw-spec/dress.git
git pull origin main --rebase
git push -u origin main
