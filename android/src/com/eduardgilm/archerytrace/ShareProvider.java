package com.eduardgilm.archerytrace;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileInputStream;

public class ShareProvider extends ContentProvider {
    @Override public boolean onCreate() { return true; }

    private File image() { return new File(getContext().getCacheDir(), "share.png"); }

    private File fileFor(Uri uri) {
        String last = uri == null ? "" : uri.getLastPathSegment();
        if ("camera.jpg".equals(last)) return new File(getContext().getCacheDir(), "camera.jpg");
        if ("backup.json".equals(last)) return new File(getContext().getCacheDir(), "backup.json");
        return image();
    }

    private boolean jpeg(File file) {
        try (FileInputStream in = new FileInputStream(file)) {
            int b0 = in.read(), b1 = in.read();
            return b0 == 0xFF && b1 == 0xD8;
        } catch (Exception e) { return false; }
    }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws java.io.FileNotFoundException {
        File file = fileFor(uri);
        boolean write = mode != null && mode.contains("w");
        if (write && !"camera.jpg".equals(file.getName())) throw new java.io.FileNotFoundException("solo lectura");
        int bits = write
            ? ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE | ParcelFileDescriptor.MODE_READ_WRITE
            : ParcelFileDescriptor.MODE_READ_ONLY;
        return ParcelFileDescriptor.open(file, bits);
    }

    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file = fileFor(uri);
        MatrixCursor cursor = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        String name = file.getName().equals("backup.json") ? "ArcheryTrace-backup.json" : jpeg(file) ? "archerytrace.jpg" : "archerytrace.png";
        cursor.addRow(new Object[]{name, file.length()});
        return cursor;
    }

    @Override public String getType(Uri uri) {
        if (uri != null && "camera.jpg".equals(uri.getLastPathSegment())) return "image/jpeg";
        if (uri != null && "backup.json".equals(uri.getLastPathSegment())) return "application/json";
        return jpeg(image()) ? "image/jpeg" : "image/png";
    }
    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
