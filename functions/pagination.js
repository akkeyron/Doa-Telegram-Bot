export function pagination(array, page_number, page_size) {
    const start = (page_number - 1) * page_size;
    const end = start + page_size;
    return array.slice(start, end);
}