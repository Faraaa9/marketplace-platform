type NotifyProviderAboutDirectInquiryParams = {
  providerId: string;
  inquiryId: string;
  senderEmail: string;
  senderName?: string | null;
};

export function getDirectInquiryNotificationData({
  providerId,
  inquiryId,
  senderEmail,
  senderName,
}: NotifyProviderAboutDirectInquiryParams) {
  const senderLabel = senderName?.trim() || senderEmail;

  return {
    userId: providerId,
    type: "DIRECT_INQUIRY",
    title: "Nauja tiesioginė žinutė",
    body: `${senderLabel} parašė jums tiesioginę žinutę`,
    link: `/tiekejas/zinutes?thread=${inquiryId}`,
  };
}
