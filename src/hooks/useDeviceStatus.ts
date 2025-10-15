export const useDeviceStatus = () => {
  const checkPlayerStatus = () => {
    const expireAt = localStorage.getItem('player_expire_at');
    if (!expireAt) return { isExpired: false, daysLeft: 0, expireAt: null };
    
    const expDate = new Date(expireAt);
    const now = new Date();
    const diff = expDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return {
      isExpired: diff < 0,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      expireAt: expDate
    };
  };
  
  const checkIptvStatus = () => {
    const expireAt = localStorage.getItem('iptv_expire_at');
    if (!expireAt) return { isExpired: false, daysLeft: 0, expireAt: null };
    
    const expDate = new Date(expireAt);
    const now = new Date();
    const diff = expDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    return {
      isExpired: diff < 0,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      expireAt: expDate
    };
  };

  const formatExpireDate = (date: Date | null) => {
    if (!date) return '--/--/----';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return { checkPlayerStatus, checkIptvStatus, formatExpireDate };
};
