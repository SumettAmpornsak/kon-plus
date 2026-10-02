const TELEGRAM_API = 'https://api.telegram.org';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (request.method === 'GET' && url.pathname === '/') {
      return json({
        ok: true,
        service: 'kon-plus-telegram',
        status: 'online'
      });
    }

    // Telegram webhook
    if (
      request.method === 'POST' &&
      url.pathname === '/telegram/webhook'
    ) {
      return handleWebhook(request, env);
    }

    return new Response('Not Found', {
      status: 404
    });
  }
};

/* =========================================================
   Telegram Webhook
========================================================= */

async function handleWebhook(request, env) {
  // Verify Telegram secret token
  const secret =
    request.headers.get(
      'X-Telegram-Bot-Api-Secret-Token'
    );

  if (
    !secret ||
    secret !== env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return new Response('Unauthorized', {
      status: 401
    });
  }

  try {
    const update = await request.json();

    await handleTelegramUpdate(
      update,
      env
    );

    return json({
      ok: true
    });
  } catch (error) {
    console.error(
      'Telegram webhook error:',
      error
    );

    return json(
      {
        ok: false,
        error: error.message
      },
      500
    );
  }
}

/* =========================================================
   Telegram Update
========================================================= */

async function handleTelegramUpdate(update, env) {
  const message = update?.message;

  if (
    !message ||
    !message.text ||
    !message.chat?.id
  ) {
    return;
  }

  const chatId = String(message.chat.id);

  // Only allow configured chat
  if (
    env.TELEGRAM_ALLOWED_CHAT_ID &&
    chatId !==
      String(env.TELEGRAM_ALLOWED_CHAT_ID)
  ) {
    await sendTelegram(
      env.TELEGRAM_BOT_TOKEN,
      chatId,
      [
        '<b>⛔ ไม่มีสิทธิ์</b>',
        '',
        'แชตนี้ไม่ได้รับอนุญาตให้ใช้งานระบบคนพลัส'
      ].join('\n')
    );

    return;
  }

  const command = normalizeCommand(
    message.text
  );

  if (!command) {
    return;
  }

  console.log(
    `Telegram command: ${command} from ${chatId}`
  );

  const reply = await executeCommand(
    command,
    env
  );

  await sendTelegram(
    env.TELEGRAM_BOT_TOKEN,
    chatId,
    reply
  );
}

/* =========================================================
   Command Parser
========================================================= */

function normalizeCommand(text) {
  const firstPart =
    String(text)
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();

  if (!firstPart.startsWith('/')) {
    return null;
  }

  // รองรับ /วันนี้@Kon_Plus_bot
  return firstPart
    .split('@')[0]
    .trim();
}

/* =========================================================
   Commands
========================================================= */

async function executeCommand(command, env) {
  switch (command) {
    case '/start':
    case '/help':
      return helpMessage();

    case '/วันนี้':
      return await todayCommand(env);

    case '/พนักงาน':
      return await employeesCommand(env);

    case '/เครื่อง':
      return await machinesCommand(env);

    case '/ot':
      return await otCommand(env);

    case '/ยังไม่จัดงาน':
      return await unassignedCommand(env);

    case '/รายงาน':
      return await reportCommand(env);

    default:
      return [
        '❌ <b>ไม่รู้จักคำสั่ง</b>',
        '',
        'พิมพ์ /help เพื่อดูคำสั่งทั้งหมด'
      ].join('\n');
  }
}

/* =========================================================
   /start /help
========================================================= */

function helpMessage() {
  return [
    '🤖 <b>ระบบคนพลัส Kon Plus</b>',
    '',
    '<b>คำสั่งที่ใช้งานได้</b>',
    '',
    '/วันนี้ - สรุปภาพรวมงานวันนี้',
    '/พนักงาน - รายชื่อพนักงาน',
    '/เครื่อง - สถานะเครื่องจักร',
    '/ot - รายชื่อคนทำ OT',
    '/ยังไม่จัดงาน - คนที่ยังไม่ได้จัดงาน',
    '/รายงาน - รายงานสรุปวันนี้',
    '',
    'พิมพ์คำสั่งได้โดยตรงใน Telegram'
  ].join('\n');
}

/* =========================================================
   /วันนี้
========================================================= */

async function todayCommand(env) {
  const date = getBangkokDate();

  const daily =
    await firebaseGet(
      `/daily/${date}`,
      env
    );

  if (!daily) {
    return [
      '📅 <b>สรุปงานวันนี้</b>',
      '',
      `วันที่: ${escapeHtml(date)}`,
      '',
      'ยังไม่มีข้อมูลประจำวันนี้'
    ].join('\n');
  }

  const assignments =
    objectValues(
      daily.assignments
    );

  let workingCount = 0;
  let machineCount = 0;
  let foldSealCount = 0;
  let unassignedCount = 0;
  let otCount = 0;
  let otHours = 0;

  for (const assignment of assignments) {
    if (!assignment) continue;

    if (
      assignment.dailyStatus ===
      'มาทำงาน'
    ) {
      workingCount++;
    }

    const job =
      assignment.job;

    const hasMachine =
      assignment.machine !== null &&
      assignment.machine !== undefined &&
      assignment.machine !== '';

    if (
      job === 'เข้าเครื่อง' ||
      hasMachine
    ) {
      machineCount++;
    }

    if (
      job === 'พับ' ||
      job === 'ซีน'
    ) {
      foldSealCount++;
    }

    if (
      assignment.dailyStatus ===
        'มาทำงาน' &&
      !job &&
      !hasMachine
    ) {
      unassignedCount++;
    }

    if (assignment.isOt === true) {
      otCount++;

      const hours =
        Number(
          assignment.otHours
        ) || 0;

      otHours += hours;
    }
  }

  return [
    '📅 <b>สรุปงานวันนี้</b>',
    '',
    `วันที่: <b>${escapeHtml(date)}</b>`,
    '',
    `👷 มาทำงาน: <b>${workingCount}</b> คน`,
    `🏭 เข้าเครื่อง: <b>${machineCount}</b> คน`,
    `📦 พับ/ซีน: <b>${foldSealCount}</b> คน`,
    `⚠️ ยังไม่ได้จัดงาน: <b>${unassignedCount}</b> คน`,
    `⏰ ทำ OT: <b>${otCount}</b> คน`,
    `🕐 ชั่วโมง OT รวม: <b>${formatNumber(otHours)}</b> ชม.`
  ].join('\n');
}

/* =========================================================
   /พนักงาน
========================================================= */

async function employeesCommand(env) {
  const users =
    await firebaseGet(
      '/users',
      env
    );

  if (!users) {
    return [
      '👥 <b>รายชื่อพนักงาน</b>',
      '',
      'ยังไม่พบข้อมูลพนักงาน'
    ].join('\n');
  }

  const employees =
    objectValues(users)
      .filter(Boolean)
      .filter(user => {
        // ไม่เอาบัญชี owner/supervisor ถ้าไม่มี employeeId
        return (
          user.employeeId ||
          user.nickname ||
          user.displayName
        );
      })
      .sort((a, b) => {
        return String(
          a.employeeId || ''
        ).localeCompare(
          String(
            b.employeeId || ''
          ),
          'th'
        );
      });

  if (employees.length === 0) {
    return [
      '👥 <b>รายชื่อพนักงาน</b>',
      '',
      'ยังไม่พบข้อมูลพนักงาน'
    ].join('\n');
  }

  const lines = [
    '👥 <b>รายชื่อพนักงาน</b>',
    ''
  ];

  for (
    let i = 0;
    i < employees.length;
    i++
  ) {
    const employee =
      employees[i];

    const id =
      employee.employeeId ||
      '-';

    const name =
      employee.displayName ||
      '-';

    const nickname =
      employee.nickname
        ? ` (${employee.nickname})`
        : '';

    const status =
      employee.status ===
      'active'
        ? '🟢'
        : '⚪';

    lines.push(
      `${status} ${escapeHtml(id)} ${escapeHtml(name)}${escapeHtml(nickname)}`
    );

    // Telegram message ไม่ควรยาวเกินไป
    if (lines.join('\n').length > 3500) {
      lines.push(
        '',
        `... และอีก ${employees.length - i - 1} คน`
      );
      break;
    }
  }

  return lines.join('\n');
}

/* =========================================================
   /เครื่อง
========================================================= */

async function machinesCommand(env) {
  const date =
    getBangkokDate();

  const daily =
    await firebaseGet(
      `/daily/${date}`,
      env
    );

  const machines =
    await firebaseGet(
      '/machines',
      env
    );

  if (!machines && !daily?.machineStates) {
    return [
      '🏭 <b>สถานะเครื่องจักร</b>',
      '',
      'ยังไม่พบข้อมูลเครื่องจักร'
    ].join('\n');
  }

  const machineStates =
    daily?.machineStates || {};

  const machineList =
    objectValues(machines || {});

  // ถ้า /machines ไม่มีข้อมูล ให้ใช้ machineStates แทน
  if (machineList.length === 0) {
    for (const [
      number,
      state
    ] of Object.entries(
      machineStates
    )) {
      machineList.push({
        number,
        id: number
      });
    }
  }

  machineList.sort(
    (a, b) =>
      String(
        a.number || ''
      ).localeCompare(
        String(
          b.number || ''
        ),
        undefined,
        {
          numeric: true
        }
      )
  );

  const lines = [
    '🏭 <b>สถานะเครื่องจักร</b>',
    `📅 ${escapeHtml(date)}`,
    ''
  ];

  for (const machine of machineList) {
    const number =
      machine.number ||
      machine.id ||
      '-';

    const state =
      machineStates[
        number
      ] || {};

    const status =
      state.status ||
      'vacant';

    let icon = '🟢';
    let statusText = 'ว่าง';

    if (status === 'in_use') {
      icon = '🔴';
      statusText = 'กำลังใช้งาน';
    } else if (
      status === 'closed'
    ) {
      icon = '⚪';
      statusText = 'ปิดใช้งาน';
    }

    const assignedEmpId =
      state.assignedEmpId;

    let assignedText = '';

    if (assignedEmpId) {
      assignedText =
        ` — ${escapeHtml(
          String(
            assignedEmpId
          )
        )}`;
    }

    lines.push(
      `${icon} เครื่อง ${escapeHtml(String(number))} — ${statusText}${assignedText}`
    );
  }

  return lines.join('\n');
}

/* =========================================================
   /ot
========================================================= */

async function otCommand(env) {
  const date =
    getBangkokDate();

  const daily =
    await firebaseGet(
      `/daily/${date}`,
      env
    );

  if (!daily) {
    return [
      '⏰ <b>OT วันนี้</b>',
      '',
      'ยังไม่มีข้อมูลวันนี้'
    ].join('\n');
  }

  const assignments =
    daily.assignments || {};

  const users =
    await firebaseGet(
      '/users',
      env
    ) || {};

  const otList = [];

  for (const [
    empId,
    assignment
  ] of Object.entries(
    assignments
  )) {
    if (
      !assignment ||
      assignment.isOt !== true
    ) {
      continue;
    }

    const user =
      users[empId] || {};

    const name =
      user.displayName ||
      user.nickname ||
      empId;

    const hours =
      Number(
        assignment.otHours
      ) || 0;

    const job =
      assignment.job ||
      '-';

    otList.push({
      empId,
      name,
      nickname:
        user.nickname || '',
      hours,
      job
    });
  }

  if (otList.length === 0) {
    return [
      '⏰ <b>OT วันนี้</b>',
      '',
      'วันนี้ยังไม่มีใครทำ OT'
    ].join('\n');
  }

  const lines = [
    '⏰ <b>รายชื่อคนทำ OT วันนี้</b>',
    ''
  ];

  let totalHours = 0;

  for (const item of otList) {
    totalHours += item.hours;

    const nick =
      item.nickname
        ? ` (${item.nickname})`
        : '';

    lines.push(
      `• ${escapeHtml(item.empId)} ${escapeHtml(item.name)}${escapeHtml(nick)} — ${formatNumber(item.hours)} ชม. — ${escapeHtml(item.job)}`
    );
  }

  lines.push(
    '',
    `🕐 รวมทั้งหมด: <b>${formatNumber(totalHours)} ชม.</b>`
  );

  return lines.join('\n');
}

/* =========================================================
   /ยังไม่จัดงาน
========================================================= */

async function unassignedCommand(env) {
  const date =
    getBangkokDate();

  const daily =
    await firebaseGet(
      `/daily/${date}`,
      env
    );

  if (!daily) {
    return [
      '⚠️ <b>ยังไม่จัดงาน</b>',
      '',
      'ยังไม่มีข้อมูลวันนี้'
    ].join('\n');
  }

  const assignments =
    daily.assignments || {};

  const users =
    await firebaseGet(
      '/users',
      env
    ) || {};

  const list = [];

  for (const [
    empId,
    assignment
  ] of Object.entries(
    assignments
  )) {
    if (!assignment) {
      continue;
    }

    const isWorking =
      assignment.dailyStatus ===
      'มาทำงาน';

    const hasJob =
      !!assignment.job ||
      (
        assignment.machine !==
          null &&
        assignment.machine !==
          undefined &&
        assignment.machine !== ''
      );

    if (
      isWorking &&
      !hasJob
    ) {
      const user =
        users[empId] || {};

      list.push({
        empId,
        name:
          user.displayName ||
          user.nickname ||
          empId,
        nickname:
          user.nickname || ''
      });
    }
  }

  if (list.length === 0) {
    return [
      '✅ <b>จัดงานครบแล้ว</b>',
      '',
      'พนักงานที่มาทำงานได้รับการจัดงานครบทุกคนแล้ว'
    ].join('\n');
  }

  const lines = [
    '⚠️ <b>พนักงานที่ยังไม่จัดงาน</b>',
    ''
  ];

  for (const employee of list) {
    const nickname =
      employee.nickname
        ? ` (${employee.nickname})`
        : '';

    lines.push(
      `• ${escapeHtml(employee.empId)} ${escapeHtml(employee.name)}${escapeHtml(nickname)}`
    );
  }

  return lines.join('\n');
}

/* =========================================================
   /รายงาน
========================================================= */

async function reportCommand(env) {
  const date =
    getBangkokDate();

  const daily =
    await firebaseGet(
      `/daily/${date}`,
      env
    );

  if (!daily) {
    return [
      '📊 <b>รายงาน Kon Plus</b>',
      '',
      `วันที่ ${escapeHtml(date)}`,
      '',
      'ยังไม่มีข้อมูลประจำวันนี้'
    ].join('\n');
  }

  const assignments =
    objectValues(
      daily.assignments
    );

  const machineStates =
    objectValues(
      daily.machineStates
    );

  let working = 0;
  let holiday = 0;
  let sick = 0;
  let personal = 0;
  let other = 0;
  let unspecified = 0;
  let ot = 0;
  let otHours = 0;

  for (const assignment of assignments) {
    if (!assignment) continue;

    switch (
      assignment.dailyStatus
    ) {
      case 'มาทำงาน':
        working++;
        break;

      case 'วันหยุด':
        holiday++;
        break;

      case 'ลาป่วย':
        sick++;
        break;

      case 'ลากิจ':
        personal++;
        break;

      case 'อื่นๆ':
        other++;
        break;

      case 'ยังไม่ได้ระบุ':
        unspecified++;
        break;
    }

    if (assignment.isOt === true) {
      ot++;

      otHours +=
        Number(
          assignment.otHours
        ) || 0;
    }
  }

  let machineInUse = 0;
  let machineVacant = 0;
  let machineClosed = 0;

  for (const machine of machineStates) {
    if (!machine) continue;

    if (
      machine.status ===
      'in_use'
    ) {
      machineInUse++;
    } else if (
      machine.status ===
      'closed'
    ) {
      machineClosed++;
    } else {
      machineVacant++;
    }
  }

  const unassigned =
    assignments.filter(
      assignment =>
        assignment &&
        assignment.dailyStatus ===
          'มาทำงาน' &&
        !assignment.job &&
        !assignment.machine
    ).length;

  return [
    '📊 <b>รายงาน Kon Plus</b>',
    '',
    `📅 ${escapeHtml(date)}`,
    '',
    '<b>พนักงาน</b>',
    `👷 มาทำงาน: ${working}`,
    `🏖 วันหยุด: ${holiday}`,
    `🤒 ลาป่วย: ${sick}`,
    `📝 ลากิจ: ${personal}`,
    `📌 อื่นๆ: ${other}`,
    `❓ ยังไม่ได้ระบุ: ${unspecified}`,
    '',
    '<b>งาน</b>',
    `🏭 เข้าเครื่อง: ${assignments.filter(a => a?.job === 'เข้าเครื่อง' || a?.machine).length}`,
    `📦 พับ/ซีน: ${assignments.filter(a => a?.job === 'พับ' || a?.job === 'ซีน').length}`,
    `⚠️ ยังไม่จัดงาน: ${unassigned}`,
    '',
    '<b>OT</b>',
    `⏰ คนทำ OT: ${ot}`,
    `🕐 ชั่วโมง OT: ${formatNumber(otHours)}`,
    '',
    '<b>เครื่องจักร</b>',
    `🔴 ใช้งาน: ${machineInUse}`,
    `🟢 ว่าง: ${machineVacant}`,
    `⚪ ปิด: ${machineClosed}`
  ].join('\n');
}

/* =========================================================
   Firebase REST API
========================================================= */

async function firebaseGet(path, env) {
  const databaseUrl =
    String(
      env.FIREBASE_DATABASE_URL || ''
    ).replace(/\/+$/, '');

  if (!databaseUrl) {
    throw new Error(
      'FIREBASE_DATABASE_URL is not configured'
    );
  }

  const accessToken =
    await getFirebaseAccessToken(
      env
    );

  const url =
    `${databaseUrl}${path}.json?access_token=${encodeURIComponent(accessToken)}`;

  const response =
    await fetch(url);

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      `Firebase GET failed: ${response.status} ${JSON.stringify(data)}`
    );
  }

  return data;
}

/* =========================================================
   Firebase Service Account OAuth
========================================================= */

async function getFirebaseAccessToken(env) {
  if (
    !env.FIREBASE_CLIENT_EMAIL ||
    !env.FIREBASE_PRIVATE_KEY
  ) {
    throw new Error(
      'Firebase service account secrets are not configured'
    );
  }

  const now =
    Math.floor(
      Date.now() / 1000
    );

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope:
      'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud:
      'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const encodedHeader =
    base64UrlEncode(
      JSON.stringify(header)
    );

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(payload)
    );

  const unsignedToken =
    `${encodedHeader}.${encodedPayload}`;

  const privateKey =
    normalizePrivateKey(
      env.FIREBASE_PRIVATE_KEY
    );

  const key =
    await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(
        privateKey
      ),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

  const signature =
    await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(
        unsignedToken
      )
    );

  const jwt =
    `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;

  const response =
    await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body:
          new URLSearchParams({
            grant_type:
              'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
          })
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.access_token
  ) {
    throw new Error(
      `Firebase OAuth failed: ${JSON.stringify(data)}`
    );
  }

  return data.access_token;
}

/* =========================================================
   Telegram API
========================================================= */

async function sendTelegram(
  botToken,
  chatId,
  text
) {
  if (
    !botToken ||
    !chatId
  ) {
    throw new Error(
      'Telegram credentials are not configured'
    );
  }

  const response =
    await fetch(
      `${TELEGRAM_API}/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram API failed: ${JSON.stringify(data)}`
    );
  }

  return data;
}

/* =========================================================
   Bangkok Date
========================================================= */

function getBangkokDate() {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).format(
    new Date()
  );
}

/* =========================================================
   Helpers
========================================================= */

function objectValues(value) {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return [];
  }

  return Object.values(value);
}

function formatNumber(value) {
  const number =
    Number(value) || 0;

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2);
}

function escapeHtml(value) {
  return String(
    value ?? ''
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   Firebase Private Key Helpers
========================================================= */

function normalizePrivateKey(value) {
  let key =
    String(value ?? '').trim();

  // รองรับกรณี Cloudflare Secret ถูกใส่มาพร้อม quote
  if (
    (key.startsWith('"') &&
      key.endsWith('"')) ||
    (key.startsWith("'") &&
      key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // รองรับทั้ง \n แบบตัวอักษร
  // และ newline จริง
  key = key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .trim();

  // รองรับกรณีเผลอใส่ Service Account JSON
  // ทั้งก้อนลงใน Secret
  if (
    key.startsWith('{') &&
    key.endsWith('}')
  ) {
    try {
      const parsed =
        JSON.parse(key);

      if (parsed.private_key) {
        key =
          String(
            parsed.private_key
          )
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .trim();
      }
    } catch {
      // ไม่ใช่ JSON
      // ใช้ค่าเดิมต่อ
    }
  }

  return key;
}

function pemToArrayBuffer(pem) {
  const normalized =
    normalizePrivateKey(pem);

  const beginMarker =
    '-----BEGIN PRIVATE KEY-----';

  const endMarker =
    '-----END PRIVATE KEY-----';

  const beginIndex =
    normalized.indexOf(
      beginMarker
    );

  const endIndex =
    normalized.indexOf(
      endMarker
    );

  if (
    beginIndex === -1 ||
    endIndex === -1 ||
    endIndex <= beginIndex
  ) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY is not a valid PKCS#8 PEM private key'
    );
  }

  const base64 =
    normalized
      .slice(
        beginIndex +
          beginMarker.length,
        endIndex
      )
      .replace(/\s/g, '');

  // ตรวจ Base64 ก่อนเรียก atob()
  if (
    !base64 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(
      base64
    ) ||
    base64.length % 4 !== 0
  ) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY contains invalid Base64 data. Check the Cloudflare FIREBASE_PRIVATE_KEY secret.'
    );
  }

  let binary;

  try {
    binary =
      atob(base64);
  } catch {
    throw new Error(
      'FIREBASE_PRIVATE_KEY contains invalid Base64 data. Check the Cloudflare FIREBASE_PRIVATE_KEY secret.'
    );
  }

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function base64UrlEncode(value) {
  const bytes =
    new TextEncoder().encode(
      value
    );

  return arrayBufferToBase64Url(
    bytes
  );
}

function arrayBufferToBase64Url(
  buffer
) {
  const bytes =
    buffer instanceof Uint8Array
      ? buffer
      : new Uint8Array(buffer);

  let binary = '';

  for (
    let i = 0;
    i < bytes.length;
    i++
  ) {
    binary +=
      String.fromCharCode(
        bytes[i]
      );
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8'
      }
    }
  );
}