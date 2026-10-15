package com.eduardgilm.archerytrace;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/** Durable FIFO. A UI callback can acknowledge only the event it actually applied. */
final class EventQueue {
    interface Disk { String read(); boolean write(String value); }
    static final class Entry {
        final long id; final String js;
        Entry(long id, String js) { this.id = id; this.js = js; }
    }
    private final Disk disk;
    private final List<Entry> entries = new ArrayList<>();
    private long next = 1;
    EventQueue(Disk disk) {
        this.disk = disk;
        String saved = disk.read();
        if (saved.isEmpty()) return;
        String[] lines = saved.split("\n"); next = Long.parseLong(lines[0]);
        for (int i = 1; i < lines.length; i++) {
            String[] pair = lines[i].split("\t", 2);
            entries.add(new Entry(Long.parseLong(pair[0]), new String(Base64.getDecoder().decode(pair[1]), StandardCharsets.UTF_8)));
        }
    }
    synchronized Entry peek() { return entries.isEmpty() ? null : entries.get(0); }
    synchronized int size() { return entries.size(); }
    synchronized void offer(String js) {
        Entry e = new Entry(next++, js); entries.add(e);
        if (!save()) { entries.remove(entries.size()-1); next--; throw new IllegalStateException("No se pudo guardar el evento"); }
    }
    synchronized void ack(long id) {
        if (entries.isEmpty() || entries.get(0).id != id) return;
        Entry e = entries.remove(0);
        if (!save()) { entries.add(0, e); throw new IllegalStateException("No se pudo confirmar el evento"); }
    }
    private boolean save() {
        StringBuilder out = new StringBuilder().append(next);
        for (Entry e : entries) out.append('\n').append(e.id).append('\t').append(Base64.getEncoder().encodeToString(e.js.getBytes(StandardCharsets.UTF_8)));
        return disk.write(out.toString());
    }
}
