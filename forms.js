module.exports = {
  "تقديم معلومات": {
    title: "تقديم معلومات",
    description: "اضغط على الزر لفتح نموذج تقديم المعلومات.",
    buttonLabel: "تقديم معلومات",
    fields: [
      { id: "adminName", label: "اسم الإداري", placeholder: "اكتب اسم الإداري", style: "Short", required: true },
      { id: "uuid", label: "UUID", placeholder: "اكتب UUID", style: "Short", required: true },
      { id: "rpName", label: "اسم RP", placeholder: "اكتب اسم RP", style: "Short", required: true },
      { id: "rpServer", label: "سيرفر RP", placeholder: "اكتب اسم السيرفر", style: "Short", required: true }
    ]
  }
};