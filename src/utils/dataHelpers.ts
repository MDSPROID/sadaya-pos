export const getSingleRelatedObject = <T>(relatedData: T | T[] | null): T | null => {
  if (Array.isArray(relatedData)) {
    return relatedData.length > 0 ? relatedData[0] : null;
  }
  return relatedData;
};