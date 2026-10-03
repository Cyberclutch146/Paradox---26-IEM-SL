const fs = require('fs');
const path = require('path');

const files = [
  "src/app/page.tsx",
  "src/app/dashboard/view.tsx",
  "src/app/chat/view.tsx",
  "src/app/community/view.tsx",
  "src/app/alerts/view.tsx",
  "src/app/map/view.tsx",
  "src/app/reports/view.tsx",
  "src/app/profile/view.tsx"
];

for (const file of files) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.log("Missing:", file);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace import
  content = content.replace(/import TopNav from "@\/components\/layout\/TopNav";/g, 'import Sidebar from "@/components/layout/Sidebar";');
  
  // Replace <div className="flex flex-col min-h-screen">
  content = content.replace(/<div className="flex flex-col min-h-screen">/, '<div className="flex flex-col md:flex-row min-h-screen">');
  
  // Replace TopNav usage
  // Handle variant="transparent" if present
  if (content.includes('variant="transparent"')) {
    content = content.replace(/<TopNav[^>]*variant="transparent"[^>]*\/>/, '<Sidebar variant="transparent" />\n      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">');
  } else {
    content = content.replace(/<TopNav[^>]*\/>/, '<Sidebar />\n      <div className="flex-1 flex flex-col min-w-0 pb-[72px] md:pb-0">');
  }
  
  // Add closing div
  if (content.includes('<Footer />')) {
    content = content.replace(/(\s*<Footer \/>\s*)<\/div>/, '$1  </div>\n    </div>');
  } else {
    content = content.replace(/(\s*<\/main>\s*)<\/div>/, '$1  </div>\n    </div>');
  }
  
  fs.writeFileSync(fullPath, content);
  console.log("Updated", file);
}
console.log("Done");
