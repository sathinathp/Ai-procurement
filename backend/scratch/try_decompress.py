import os
import zlib
import bz2
import lzma

try:
    import zstandard as zstd
except ImportError:
    zstd = None

try:
    import brotli
except ImportError:
    brotli = None

pb_path = r"C:\Users\Sathinath\.gemini\antigravity\conversations\99222479-63ba-45de-8ae8-de5b1ed25b0f.pb"

if not os.path.exists(pb_path):
    print("File not found")
else:
    with open(pb_path, "rb") as f:
        data = f.read()
    
    print(f"Read {len(data)} bytes. Header: {data[:16].hex()}")
    
    # Try zlib
    try:
        decomp = zlib.decompress(data)
        print("Success: zlib")
        print(decomp[:200])
    except Exception as e:
        print("Fail: zlib", e)
        
    try:
        decomp = zlib.decompress(data, wbits=16+zlib.MAX_WBITS)
        print("Success: zlib gzip")
        print(decomp[:200])
    except Exception as e:
        print("Fail: zlib gzip", e)

    try:
        decomp = zlib.decompress(data, wbits=-zlib.MAX_WBITS)
        print("Success: zlib raw")
        print(decomp[:200])
    except Exception as e:
        print("Fail: zlib raw", e)

    # Try bz2
    try:
        decomp = bz2.decompress(data)
        print("Success: bz2")
        print(decomp[:200])
    except Exception as e:
        print("Fail: bz2", e)
        
    # Try lzma
    try:
        decomp = lzma.decompress(data)
        print("Success: lzma")
        print(decomp[:200])
    except Exception as e:
        print("Fail: lzma", e)
        
    # Try zstandard
    if zstd:
        try:
            dctx = zstd.ZstdDecompressor()
            decomp = dctx.decompress(data)
            print("Success: zstd")
            print(decomp[:200])
        except Exception as e:
            print("Fail: zstd", e)
    else:
        print("zstandard not installed")
        
    # Try brotli
    if brotli:
        try:
            decomp = brotli.decompress(data)
            print("Success: brotli")
            print(decomp[:200])
        except Exception as e:
            print("Fail: brotli", e)
    else:
        print("brotli not installed")
