// Minimal IPS (International Patching System) writer.
// Port of the subset of ips.py used by gen_patches.py.

const MAX_RECORD_SIZE = 0xffff;
// A record starting at this offset would be ambiguous with the EOF marker.
const EOF_OFFSET = 0x454f46;
const MAX_OFFSET = 0xffffff;

export interface IpsRecord {
  offset: number;
  content: Buffer;
}

/** Records that replace the whole buffer (used when no original logo is given). */
export function fullRecords(data: Buffer): IpsRecord[] {
  const records: IpsRecord[] = [];
  for (let pos = 0; pos < data.length; pos += MAX_RECORD_SIZE) {
    records.push({
      offset: pos,
      content: data.subarray(pos, Math.min(pos + MAX_RECORD_SIZE, data.length)),
    });
  }
  return records;
}

/** Serialize records (shifted by baseOffset) into an IPS file. */
export function serializeIps(records: IpsRecord[], baseOffset: number): Buffer {
  const parts: Buffer[] = [Buffer.from("PATCH", "ascii")];
  for (const record of records) {
    if (record.content.length === 0) continue;
    let offset = record.offset + baseOffset;
    let content = record.content;
    while (content.length > 0) {
      if (offset > MAX_OFFSET) {
        throw new Error("Offset does not fit into an IPS record");
      }
      if (offset === EOF_OFFSET) {
        // A record offset spelling "EOF" would be read as the end marker.
        // Never happens with the logo offsets used here (all < 0x454F46).
        throw new Error("Record offset collides with the IPS EOF marker");
      }
      const size = Math.min(content.length, MAX_RECORD_SIZE);
      const header = Buffer.alloc(5);
      header.writeUIntBE(offset, 0, 3);
      header.writeUInt16BE(size, 3);
      parts.push(header, content.subarray(0, size));
      content = content.subarray(size);
      offset += size;
    }
  }
  parts.push(Buffer.from("EOF", "ascii"));
  return Buffer.concat(parts);
}
