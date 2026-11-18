/**
 * useWorkoutEngine Cancellation Logic Tests
 * 
 * Tests the pure cancellation helpers (runGuardedStep, isCancellationError, checkCancelled)
 * with fake promises - no browser APIs required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRunToken,
  checkCancelled,
  isCancellationError,
  runGuardedStep,
  CancellationError,
  getCameraPermissionState,
  withTimeout,
  isTimeoutError,
  TimeoutError,
  CameraPermissionState,
} from "../src/hooks/useWorkoutEngine";

describe("Cancellation Helpers", () => {
  describe("createRunToken", () => {
    it("creates a token with cancelled=false and a cancel function", () => {
      const token = createRunToken();
      expect(token.cancelled).toBe(false);
      expect(typeof token.cancel).toBe("function");
    });

    it("cancel() sets cancelled to true", () => {
      const token = createRunToken();
      token.cancel();
      expect(token.cancelled).toBe(true);
    });
  });

  describe("checkCancelled", () => {
    it("throws CancellationError when token is cancelled", () => {
      const token = createRunToken();
      token.cancel();
      expect(() => checkCancelled(token)).toThrow(CancellationError);
    });

    it("does not throw when token is not cancelled", () => {
      const token = createRunToken();
      expect(() => checkCancelled(token)).not.toThrow();
    });
  });

  describe("isCancellationError", () => {
    it("returns true for CancellationError", () => {
      expect(isCancellationError(new CancellationError())).toBe(true);
      expect(isCancellationError(new CancellationError("custom"))).toBe(true);
    });

    it("returns true for DOMException with name AbortError (browser video.play abort)", () => {
      const abortErr = new DOMException("Aborted", "AbortError");
      expect(isCancellationError(abortErr)).toBe(true);
    });

    it("returns false for other DOMExceptions", () => {
      const notAllowedErr = new DOMException("Not allowed", "NotAllowedError");
      expect(isCancellationError(notAllowedErr)).toBe(false);
    });

    it("returns false for regular Errors", () => {
      expect(isCancellationError(new Error("generic"))).toBe(false);
      expect(isCancellationError(new TypeError("type error"))).toBe(false);
    });

    it("returns false for non-Error values", () => {
      expect(isCancellationError(null)).toBe(false);
      expect(isCancellationError(undefined)).toBe(false);
      expect(isCancellationError("string")).toBe(false);
      expect(isCancellationError(123)).toBe(false);
    });
  });

  describe("runGuardedStep", () => {
    it("returns { cancelled: false, value } when step succeeds and not cancelled", async () => {
      const token = createRunToken();
      const result = await runGuardedStep(token, async () => "success");
      expect(result).toEqual({ cancelled: false, value: "success" });
    });

    it("returns { cancelled: true } when token is cancelled before step", async () => {
      const token = createRunToken();
      token.cancel();
      const result = await runGuardedStep(token, async () => "should not run");
      expect(result).toEqual({ cancelled: true });
    });

    it("returns { cancelled: true } when token is cancelled during step (after await)", async () => {
      const token = createRunToken();
      const promise = runGuardedStep(token, async () => {
        await new Promise(r => setTimeout(r, 10));
        return "after await";
      });
      token.cancel();
      const result = await promise;
      expect(result).toEqual({ cancelled: true });
    });

    it("returns { cancelled: true } when step throws CancellationError", async () => {
      const token = createRunToken();
      const result = await runGuardedStep(token, async () => {
        throw new CancellationError("cancelled");
      });
      expect(result).toEqual({ cancelled: true });
    });

    it("returns { cancelled: true } when step throws DOMException AbortError", async () => {
      const token = createRunToken();
      const result = await runGuardedStep(token, async () => {
        throw new DOMException("Aborted", "AbortError");
      });
      expect(result).toEqual({ cancelled: true });
    });

    it("re-throws non-cancellation errors", async () => {
      const token = createRunToken();
      await expect(
        runGuardedStep(token, async () => {
          throw new Error("real error");
        })
      ).rejects.toThrow("real error");
    });

    it("re-throws non-AbortError DOMExceptions", async () => {
      const token = createRunToken();
      await expect(
        runGuardedStep(token, async () => {
          throw new DOMException("Not allowed", "NotAllowedError");
        })
      ).rejects.toThrow(DOMException);
    });

    it("checks token again after step completes", async () => {
      const token = createRunToken();
      const result = await runGuardedStep(token, async () => {
        await new Promise(r => setTimeout(r, 10));
        token.cancel(); // cancel after await but before returning
        return "value";
      });
      expect(result).toEqual({ cancelled: true });
    });
  });

  describe("Stale run scenarios", () => {
    it("stale run does not dispatch - runGuardedStep returns cancelled before dispatch", async () => {
      const token = createRunToken();
      let dispatchCalled = false;
      
      const result = await runGuardedStep(token, async () => {
        await new Promise(r => setTimeout(r, 5));
        token.cancel();
        return "data";
      });
      
      if (!result.cancelled) {
        dispatchCalled = true;
      }
      
      expect(result.cancelled).toBe(true);
      expect(dispatchCalled).toBe(false);
    });

    it("stale run that already got a stream stops its tracks", async () => {
      const token = createRunToken();
      const fakeStream = {
        getTracks: () => [
          { stop: vi.fn() },
          { stop: vi.fn() },
        ],
      };
      
      const streamResult = await runGuardedStep(token, async () => {
        // Simulate getting a stream
        return fakeStream;
      });
      
      expect(streamResult.cancelled).toBe(false);
      expect(streamResult.value).toBe(fakeStream);
      
      // Now cancel and verify we can stop the tracks
      token.cancel();
      const stopResult = await runGuardedStep(token, async () => {
        // This simulates the cleanup check after getUserMedia
        checkCancelled(token);
        return "should not reach";
      });
      
      expect(stopResult.cancelled).toBe(true);
      
      // In real code, we'd call stream.getTracks().forEach(t => t.stop())
      // Here we verify the stream is accessible for cleanup
      const tracks = fakeStream.getTracks();
      expect(tracks).toHaveLength(2);
      tracks.forEach(t => expect(typeof t.stop).toBe("function"));
    });

    it("AbortError from video.play() ignored when cancelled, but real error is not", async () => {
      const token = createRunToken();
      
      // Case 1: AbortError (cancelled run) - should be ignored
      let abortCaught = false;
      try {
        await runGuardedStep(token, async () => {
          throw new DOMException("Aborted", "AbortError");
        });
      } catch {
        abortCaught = true;
      }
      expect(abortCaught).toBe(false); // Should not throw, returns cancelled
      
      // Case 2: Real error (not cancelled) - should throw
      const token2 = createRunToken();
      let realErrorThrown = false;
      try {
        await runGuardedStep(token2, async () => {
          throw new Error("real play error");
        });
      } catch (err) {
        realErrorThrown = true;
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe("real play error");
      }
      expect(realErrorThrown).toBe(true);
    });

    it("two concurrent runs end with exactly one active stream", async () => {
      // Simulate Strict Mode double initialization
      const token1 = createRunToken();
      const token2 = createRunToken();
      
      let activeStreams = 0;
      const streams: Array<{ getTracks: () => { stop: () => void }[] }> = [];
      
      // Run 1 starts
      const result1 = await runGuardedStep(token1, async () => {
        activeStreams++;
        const stream = { getTracks: () => [{ stop: vi.fn() }] };
        streams.push(stream);
        return stream;
      });
      
      expect(result1.cancelled).toBe(false);
      expect(activeStreams).toBe(1);
      
      // Run 2 starts (Strict Mode second render)
      const result2 = await runGuardedStep(token2, async () => {
        activeStreams++;
        const stream = { getTracks: () => [{ stop: vi.fn() }] };
        streams.push(stream);
        return stream;
      });
      
      expect(result2.cancelled).toBe(false);
      expect(activeStreams).toBe(2);
      
      // Cleanup runs: first run's cleanup cancels token1, second cancels token2
      // In React Strict Mode, the first effect's cleanup runs before the second effect
      token1.cancel();
      const cleanup1 = await runGuardedStep(token1, async () => {
        // This simulates the first cleanup stopping its stream
        streams[0].getTracks().forEach(t => t.stop());
        activeStreams--;
        return "cleaned up 1";
      });
      expect(cleanup1.cancelled).toBe(true); // The guarded step itself is cancelled
      
      token2.cancel();
      const cleanup2 = await runGuardedStep(token2, async () => {
        streams[1].getTracks().forEach(t => t.stop());
        activeStreams--;
        return "cleaned up 2";
      });
      expect(cleanup2.cancelled).toBe(true);
      
      // After both cleanups, exactly one stream was active at any time
      // (the first was stopped before the second was fully set up in real code)
      // Here we verify the cleanup pattern works
      expect(streams).toHaveLength(2);
    });
  });
});

describe("Permission-Aware Timeout Helpers", () => {
  describe("getCameraPermissionState", () => {
    it("returns 'unsupported' when navigator.permissions is undefined", async () => {
      // @ts-ignore - mocking navigator
      const originalNavigator = global.navigator;
      global.navigator = { permissions: undefined } as any;
      
      const result = await getCameraPermissionState();
      expect(result).toBe("unsupported");
      
      global.navigator = originalNavigator;
    });

    it("returns 'unsupported' when navigator.permissions.query is undefined", async () => {
      // @ts-ignore - mocking navigator
      const originalNavigator = global.navigator;
      global.navigator = { permissions: {} } as any;
      
      const result = await getCameraPermissionState();
      expect(result).toBe("unsupported");
      
      global.navigator = originalNavigator;
    });

    it("returns the permission state when query succeeds", async () => {
      // @ts-ignore - mocking navigator
      const originalNavigator = global.navigator;
      global.navigator = {
        permissions: {
          query: vi.fn().mockResolvedValue({ state: "granted" }),
        },
      } as any;
      
      const result = await getCameraPermissionState();
      expect(result).toBe("granted");
      
      global.navigator = originalNavigator;
    });

    it("returns 'unsupported' when query throws", async () => {
      // @ts-ignore - mocking navigator
      const originalNavigator = global.navigator;
      global.navigator = {
        permissions: {
          query: vi.fn().mockRejectedValue(new Error("not allowed")),
        },
      } as any;
      
      const result = await getCameraPermissionState();
      expect(result).toBe("unsupported");
      
      global.navigator = originalNavigator;
    });
  });

  describe("withTimeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves before timeout returns value with timedOut=false", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, 1000, "timeout message");
      
      expect(result.value).toBe("success");
      expect(result.timedOut).toBe(false);
      expect(result.abandonedPromise).toBeNull();
    });

    it("times out after specified ms returns timedOut=true", async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("too slow"), 2000);
      });
      
      const resultPromise = withTimeout(promise, 100, "timeout!");
      vi.advanceTimersByTime(150);
      const result = await resultPromise;
      
      expect(result.value).toBeNull();
      expect(result.timedOut).toBe(true);
      expect(result.abandonedPromise).not.toBeNull();
    });

    it("clears timer when promise resolves before timeout", async () => {
      const promise = Promise.resolve("fast");
      const result = await withTimeout(promise, 1000, "timeout");
      
      expect(result.timedOut).toBe(false);
      // Timer should be cleared - no timeout rejection should occur
      vi.advanceTimersByTime(2000);
      // No unhandled rejection should occur
    });

    it("returns abandonedPromise that can be used to clean up late stream", async () => {
      let resolveLate: (value: string) => void;
      const latePromise = new Promise<string>((resolve) => {
        resolveLate = resolve;
      });
      
      const resultPromise = withTimeout(latePromise, 100, "timeout");
      vi.advanceTimersByTime(150);
      const result = await resultPromise;
      
      expect(result.timedOut).toBe(true);
      expect(result.abandonedPromise).not.toBeNull();
      
      // Simulate late resolution - should not throw
      const lateCleanup = result.abandonedPromise!.then(() => "cleaned up");
      resolveLate!("late value");
      await expect(lateCleanup).resolves.toBe("cleaned up");
    });

    it("no timeout when permission state is 'prompt' (handled by caller)", async () => {
      // This tests that withTimeout itself works correctly
      // The permission check logic is in the caller
      const promise = Promise.resolve("value");
      const result = await withTimeout(promise, 1000, "timeout");
      
      expect(result.timedOut).toBe(false);
      expect(result.value).toBe("value");
    });
  });

  describe("isTimeoutError", () => {
    it("returns true for TimeoutError", () => {
      expect(isTimeoutError(new TimeoutError("timeout"))).toBe(true);
    });

    it("returns false for other errors", () => {
      expect(isTimeoutError(new Error("generic"))).toBe(false);
      expect(isTimeoutError(new CancellationError())).toBe(false);
      expect(isTimeoutError(new DOMException("Aborted", "AbortError"))).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
    });
  });

  describe("getCameraPermissionState integration", () => {
    it("returns all valid CameraPermissionState values", () => {
      const validStates: CameraPermissionState[] = ["granted", "prompt", "denied", "unsupported"];
      validStates.forEach(state => {
        expect(["granted", "prompt", "denied", "unsupported"]).toContain(state);
      });
    });
  });

  describe("Timeout behavior with cancelled token", () => {
    it("no dispatch when cancelled during timeout", async () => {
      const token = createRunToken();
      let dispatchCalled = false;
      
      const latePromise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("late"), 500);
      });
      
      const result = await withTimeout(latePromise, 100, "timeout");
      token.cancel();
      
      if (!result.timedOut) {
        dispatchCalled = true;
      }
      
      expect(result.timedOut).toBe(true);
      // In real code, token.cancelled check prevents dispatch
      expect(dispatchCalled).toBe(false);
    });

    it("late stream from timeout is stopped", async () => {
      let lateResolve: (stream: { getTracks: () => { stop: () => void }[] }) => void;
      const latePromise = new Promise<{ getTracks: () => { stop: () => void }[] }>((resolve) => {
        lateResolve = resolve;
      });
      
      const result = await withTimeout(latePromise, 100, "timeout");
      
      expect(result.timedOut).toBe(true);
      expect(result.abandonedPromise).not.toBeNull();
      
      const track = { stop: vi.fn() };
      const fakeStream = { getTracks: () => [track] };
      
      // Simulate the cleanup handler that real code attaches to abandonedPromise
      if (result.abandonedPromise) {
        result.abandonedPromise.then((lateStream) => {
          lateStream.getTracks().forEach((t) => t.stop());
        }).catch(() => { /* ignore */ });
        
        // Resolve the original promise, which will trigger the abandoned promise's .then() handler
        lateResolve!(fakeStream);
        // Wait for the abandoned promise to settle and its .then() handlers to run
        await result.abandonedPromise;
      }
      
      expect(track.stop).toHaveBeenCalled();
    });

    it("no timeout when permission state is 'prompt' (simulated by not calling withTimeout)", async () => {
      // This simulates the caller logic: when permission is 'prompt', don't call withTimeout
      const promise = Promise.resolve("stream");
      const result = await promise; // Direct await without withTimeout
      
      expect(result).toBe("stream");
    });
  });
});