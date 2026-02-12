const axios = require('axios');

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK';

const sendSlackNotification = async (message, channel = '#contracts') => {
  if (!SLACK_WEBHOOK_URL || SLACK_WEBHOOK_URL.includes('YOUR/SLACK/WEBHOOK')) {
    console.log('Slack webhook not configured');
    return;
  }

  try {
    await axios.post(SLACK_WEBHOOK_URL, {
      channel: channel,
      username: 'Contract Tracker',
      icon_emoji: ':contract:',
      text: message
    });
  } catch (error) {
    console.error('Slack notification failed:', error.message);
  }
};

const notifyContractExpiry = async (contract, daysLeft) => {
  const urgency = daysLeft <= 7 ? '🚨 URGENT' : daysLeft <= 30 ? '⚠️ WARNING' : '📅 REMINDER';
  const message = `${urgency}: Contract "${contract.name}" expires in ${daysLeft} days (${contract.endDate})`;
  await sendSlackNotification(message);
};

const notifyNewContract = async (contract) => {
  const message = `✅ New contract added: "${contract.name}" - Team: ${contract.team} - Owner: ${contract.owner}`;
  await sendSlackNotification(message);
};

module.exports = {
  sendSlackNotification,
  notifyContractExpiry,
  notifyNewContract
};