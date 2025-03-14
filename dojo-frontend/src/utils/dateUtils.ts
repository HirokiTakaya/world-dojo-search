// src/utils/dateUtils.ts

export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2); // 月は0から始まるため+1
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}-${month}-${day}`;
  };
  