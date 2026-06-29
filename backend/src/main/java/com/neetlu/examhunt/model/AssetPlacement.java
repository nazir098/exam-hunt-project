package com.neetlu.examhunt.model;

/** Inline figure placement for structured/hybrid question stems ({{asset:N}} markers). */
public class AssetPlacement {

    private int index;
    private String marker;
    private String path;
    private String url;

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public String getMarker() {
        return marker;
    }

    public void setMarker(String marker) {
        this.marker = marker;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
