
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");

const { google } = require("googleapis");
const forms = require("./forms");

// ==================== الإعدادات ====================

// ضع توكن البوت هنا
const DISCORD_TOKEN = "MTU2MjUxNzY0NDA2NDcxODk4OQ.GQXWJD.0gd-ksMAZQeLLW_m4aOZcRMdu_HErbT0zzr00Q";

// ضع رابط Google Sheets كاملًا هنا
const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SWlejrLXPVI2Uo2a_qdMFUOHH_yeUMj8XzhnNiC26_I/edit?usp=sharing";

// اسم ورقة البيانات داخل Google Sheets
const GOOGLE_SHEET_NAME = "Responses";

// استخراج رقم الجدول تلقائيًا من الرابط
const sheetIdMatch = GOOGLE_SHEET_URL.match(
  /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
);

if (!sheetIdMatch) {
  throw new Error("رابط Google Sheets غير صحيح. تأكد من وضع الرابط كاملًا.");
}

const GOOGLE_SPREADSHEET_ID = sheetIdMatch[1];

// اسم النموذج
const FORM_KEY = "تقديم معلومات";

// معرّف زر النموذج
const FORM_BUTTON_ID = "open_form:info";

// ==================== تشغيل البوت ====================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==================== لوحة النموذج ====================

function buildPanel() {
  const form = forms[FORM_KEY];

  if (!form) {
    throw new Error(`النموذج غير موجود داخل forms.js: ${FORM_KEY}`);
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 تقديم معلومات الإدارة")
    .setDescription(
      "اضغط على زر **تقديم معلومات** بالأسفل، ثم عبّئ البيانات المطلوبة. ستُرسل إجابتك تلقائيًا إلى Google Sheets."
    )
    .setColor(0x5865F2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(FORM_BUTTON_ID)
      .setLabel(form.buttonLabel || "تقديم معلومات")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📝")
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

// ==================== الاتصال بـ Google Sheets ====================

async function appendToSheet(values) {
  const auth = new google.auth.GoogleAuth({
    keyFile:
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      "./service-account.json",
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  });

  const sheets = google.sheets({
    version: "v4",
    auth
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SPREADSHEET_ID,
    range: `${GOOGLE_SHEET_NAME}!A:Z`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values]
    }
  });
}

// ==================== إنشاء نافذة النموذج ====================

function makeModal(formKey) {
  const form = forms[formKey];

  if (!form) {
    throw new Error(`النموذج غير موجود: ${formKey}`);
  }

  const modal = new ModalBuilder()
    .setCustomId(`form_modal:${formKey}`)
    .setTitle(form.title.slice(0, 45));

  for (const field of form.fields.slice(0, 5)) {
    const input = new TextInputBuilder()
      .setCustomId(field.id)
      .setLabel(field.label.slice(0, 45))
      .setPlaceholder((field.placeholder || "").slice(0, 100))
      .setRequired(field.required !== false)
      .setStyle(
        field.style === "Paragraph"
          ? TextInputStyle.Paragraph
          : TextInputStyle.Short
      );

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );
  }

  return modal;
}

// ==================== تسجيل الدخول ====================

client.once("ready", () => {
  console.log(`تم تسجيل الدخول باسم ${client.user.tag}`);
  console.log(
    "لنشر النموذج، اكتب !forms في القناة المطلوبة مرة واحدة."
  );
});

// ==================== نشر رسالة الزر الثابتة ====================

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  if (message.content.trim().toLowerCase() !== "!forms") {
    return;
  }

  try {
    await message.reply(buildPanel());
  } catch (error) {
    console.error("تعذر نشر لوحة النموذج:", error);

    await message.reply(
      "❌ تعذر نشر النموذج. راجع سجل الاستضافة."
    ).catch(() => {});
  }
});

// ==================== معالجة الأزرار والنموذج ====================

client.on("interactionCreate", async interaction => {
  try {
    // عند الضغط على زر تقديم المعلومات
    if (
      interaction.isButton() &&
      interaction.customId === FORM_BUTTON_ID
    ) {
      return await interaction.showModal(
        makeModal(FORM_KEY)
      );
    }

    // عند إرسال النموذج
    if (
      interaction.isModalSubmit() &&
      interaction.customId === `form_modal:${FORM_KEY}`
    ) {
      await interaction.deferReply({
        ephemeral: true
      });

      const form = forms[FORM_KEY];

      const answers = form.fields.map(field =>
        interaction.fields.getTextInputValue(field.id)
      );

      const row = [
        new Date().toISOString(),
        interaction.user.username,
        interaction.user.id,
        ...answers
      ];

      await appendToSheet(row);

      await interaction.editReply(
        "✅ تم إرسال المعلومات وحفظها بنجاح في Google Sheets."
      );
    }
  } catch (error) {
    console.error(
      "خطأ أثناء معالجة النموذج:",
      error
    );

    const errorMessage =
      "❌ حدث خطأ أثناء إرسال النموذج. راجع سجل الاستضافة للتفاصيل.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage).catch(() => {});
    } else {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ==================== التحقق من التوكن ====================

if (
  !DISCORD_TOKEN ||
  DISCORD_TOKEN === "ضع_توكن_البوت_هنا"
) {
  console.error(
    "❌ ضع توكن البوت الصحيح داخل index.js."
  );
  process.exit(1);
}

// ==================== تشغيل البوت ====================

client.login(DISCORD_TOKEN);
