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
  formatDate: function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    // Format date as dd.mm.yyyy HH:MM
    const formattedDate = date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Calculate relative time
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let relativeTime;

    if (diffDays > 1) {
      relativeTime = `${diffDays} days ago`;
    } else if (diffHours > 1) {
      relativeTime = `${diffHours} hours ago`;
    } else if (diffMinutes > 1) {
      relativeTime = `${diffMinutes} minutes ago`;
    } else {
      relativeTime = "just now";
    }

    return `${formattedDate} (approximately ${relativeTime})`;
  },
};
