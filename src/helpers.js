module.exports = {
  adjustDate: (dateStr) => {
    try {
      const date = new Date(dateStr);
      date.setSeconds(date.getSeconds() - 1);
      return date.toISOString();
    } catch (err) {
      return null;
    }
  },
};
