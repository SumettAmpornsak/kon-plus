// Telegram Bot Integration Service for Kon Plus
// Bot Token อยู่ใน Cloudflare Worker เท่านั้น

import { auth } from './firebase';

export const TELEGRAM_WORKER_URL =
  'https://kon-plus-telegram.sumett13ampornsak.workers.dev';

export async function sendTelegramMessage(
  chatId,
  text
) {
  if (
    !chatId ||
    !text ||
    !auth.currentUser
  ) {
    return false;
  }

  try {
    const idToken =
      await auth.currentUser.getIdToken();

    const response =
      await fetch(
        `${TELEGRAM_WORKER_URL}/api/telegram/send`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${idToken}`
          },

          body: JSON.stringify({
            chatId:
              String(chatId),

            text:
              String(text)
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        'Telegram Worker request failed:',
        response.status,
        data
      );

      return false;
    }

    return data.ok === true;

  } catch (error) {
    console.error(
      'Failed to send Telegram message:',
      error
    );

    return false;
  }
}

export async function sendTelegramNotification(
  settings = {},
  categoryKey,
  message
) {
  if (
    !settings.telegram?.enabled
  ) {
    return false;
  }

  const categories =
    settings.notificationCategories ||
    {};

  if (
    categoryKey &&
    categories[categoryKey] === false
  ) {
    return false;
  }

  const chatId =
    settings.telegram?.chatId;

  if (!chatId) {
    return false;
  }

  const formattedText =
    `<b>[คนพลัส Kon Plus]</b> 📢\n${message}`;

  return await sendTelegramMessage(
    chatId,
    formattedText
  );
}

export function executeTelegramCommand(
  commandText,
  systemData
) {
  const parts =
    String(commandText || '')
      .trim()
      .split(/\s+/);

  const cmd =
    parts[0]?.toLowerCase();

  switch (cmd) {

    case '/start':
    case '/help':
      return `🤖 <b>คำสั่งระบบคนพลัส:</b>
/วันนี้ - สรุปภาพรวมงานวันนี้
/พนักงาน - รายชื่อพนักงานและสถานะ
/เครื่อง - สถานะเครื่องจักรทั้งหมด
/ot - สรุป OT ประจำวัน
/ยังไม่จัดงาน - รายชื่อคนที่ยังไม่ได้จัดงาน
/รายงาน - สรุปยอดรวมเดือนนี้`;

    case '/วันนี้': {
      const summary =
        systemData?.todaySummary || {};

      return `📅 <b>สรุปงานวันนี้:</b>
มาทำงาน: ${summary.workingCount || 0} คน
เข้าเครื่อง: ${summary.machineCount || 0} คน
พับ/ซีน: ${summary.foldSealCount || 0} คน
ยังไม่ได้จัดงาน: ${summary.unassignedCount || 0} คน
ทำ OT: ${summary.otCount || 0} คน (${summary.otHours || 0} ชม.)`;
    }

    case '/เครื่อง': {
      const machines =
        systemData?.machines || [];

      const lines =
        machines.map(m => {

          const icon =
            m.status === 'in_use'
              ? '🔴'
              : m.status === 'closed'
                ? '⚪'
                : '🟢';

          const emp =
            m.assignedName
              ? `(${m.assignedName})`
              : '';

          return `• ${icon} เครื่อง ${m.number} ${emp}`;
        });

      return (
        `🏭 <b>สถานะเครื่องจักร:</b>\n` +
        (
          lines.length
            ? lines.join('\n')
            : 'ยังไม่มีข้อมูลเครื่องจักร'
        )
      );
    }

    case '/ot': {
      const otList =
        systemData?.otList || [];

      if (
        otList.length === 0
      ) {
        return '⏰ วันนี้ยังไม่มีใครทำ OT';
      }

      const lines =
        otList.map(item =>
          `• ${item.name}: ${item.otHours} ชม. (${item.job || '-'})`
        );

      return (
        `⏰ <b>รายชื่อคนทำ OT วันนี้:</b>\n` +
        lines.join('\n')
      );
    }

    case '/ยังไม่จัดงาน': {
      const unassigned =
        systemData?.unassignedList || [];

      if (
        unassigned.length === 0
      ) {
        return '✅ พนักงานที่มาทำงานได้รับการจัดงานครบทุกคนแล้ว!';
      }

      const lines =
        unassigned.map(e =>
          `• ${e.employeeId || e.id || '-'} ${e.name || '-'} (${e.nickname || '-'})`
        );

      return (
        `⚠️ <b>พนักงานที่ยังไม่จัดงาน:</b>\n` +
        lines.join('\n')
      );
    }

    case '/รายงาน': {
      const summary =
        systemData?.todaySummary || {};

      return `📊 <b>รายงานวันนี้:</b>

มาทำงาน: ${summary.workingCount || 0} คน
เข้าเครื่อง: ${summary.machineCount || 0} คน
พับ/ซีน: ${summary.foldSealCount || 0} คน
ยังไม่ได้จัดงาน: ${summary.unassignedCount || 0} คน
OT: ${summary.otCount || 0} คน
ชั่วโมง OT: ${summary.otHours || 0} ชม.`;
    }

    default:
      return '❌ ไม่รู้จักคำสั่ง พิมพ์ /help เพื่อดูคำสั่งทั้งหมด';
  }
}