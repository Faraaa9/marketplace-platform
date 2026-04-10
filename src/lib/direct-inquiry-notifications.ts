type NotifyProviderAboutDirectInquiryParams = {
  providerId: string;
  senderEmail: string;
  senderName?: string | null;
};

export function getDirectInquiryNotificationData({
  providerId,
  senderEmail,
  senderName,
}: NotifyProviderAboutDirectInquiryParams) {
  const senderLabel = senderName?.trim() || senderEmail;

  return {
    userId: providerId,
    type: "DIRECT_INQUIRY",
    title: "Nauja tiesioginė žinutė",
    body: `${senderLabel} parašė jums tiesioginę žinutę`,
    link: "/tiekejas/zinutes",
  };
}
