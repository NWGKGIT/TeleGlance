import httpx
import pytest
import respx

from teleglance.errors import RateLimited
from teleglance.transport import Transport


def fast_transport(**kw):
    kw.setdefault("rate_limit", 0)
    kw.setdefault("backoff_base", 0.001)
    return Transport(**kw)


@respx.mock
async def test_retries_on_5xx_then_succeeds():
    route = respx.get("https://t.me/s/x").mock(
        side_effect=[httpx.Response(500), httpx.Response(200, text="ok")]
    )
    transport = fast_transport(retries=2)
    response = await transport.get("https://t.me/s/x")
    assert response.status_code == 200
    assert route.call_count == 2
    await transport.aclose()


@respx.mock
async def test_gives_up_after_retries_on_5xx():
    respx.get("https://t.me/s/x").mock(return_value=httpx.Response(503))
    transport = fast_transport(retries=1)
    response = await transport.get("https://t.me/s/x")
    assert response.status_code == 503  # final attempt's response is returned
    await transport.aclose()


@respx.mock
async def test_429_retries_then_succeeds():
    route = respx.get("https://t.me/s/x").mock(
        side_effect=[
            httpx.Response(429, headers={"Retry-After": "0"}),
            httpx.Response(200, text="ok"),
        ]
    )
    transport = fast_transport(retries=2)
    response = await transport.get("https://t.me/s/x")
    assert response.status_code == 200
    assert route.call_count == 2
    await transport.aclose()


@respx.mock
async def test_429_exhausted_raises_rate_limited():
    respx.get("https://t.me/s/x").mock(
        return_value=httpx.Response(429, headers={"Retry-After": "7"})
    )
    transport = fast_transport(retries=1)
    with pytest.raises(RateLimited) as excinfo:
        await transport.get("https://t.me/s/x")
    assert excinfo.value.retry_after == 7.0
    await transport.aclose()


@respx.mock
async def test_transport_error_retried():
    route = respx.get("https://t.me/s/x").mock(
        side_effect=[httpx.ConnectError("boom"), httpx.Response(200, text="ok")]
    )
    transport = fast_transport(retries=2)
    response = await transport.get("https://t.me/s/x")
    assert response.status_code == 200
    assert route.call_count == 2
    await transport.aclose()


@respx.mock
async def test_transport_error_exhausted_raises():
    respx.get("https://t.me/s/x").mock(side_effect=httpx.ConnectError("boom"))
    transport = fast_transport(retries=1)
    with pytest.raises(httpx.ConnectError):
        await transport.get("https://t.me/s/x")
    await transport.aclose()


@respx.mock
async def test_4xx_returned_to_caller():
    respx.get("https://t.me/s/x").mock(return_value=httpx.Response(404))
    transport = fast_transport(retries=3)
    response = await transport.get("https://t.me/s/x")
    assert response.status_code == 404
    await transport.aclose()


@respx.mock
async def test_hooks_are_called():
    respx.get("https://t.me/s/x").mock(return_value=httpx.Response(200, text="ok"))
    seen: dict[str, object] = {}

    async def on_request(request: httpx.Request) -> None:
        seen["request"] = str(request.url)

    async def on_response(response: httpx.Response) -> None:
        seen["status"] = response.status_code

    transport = fast_transport(request_hooks=[on_request], response_hooks=[on_response])
    await transport.get("https://t.me/s/x")
    assert seen == {"request": "https://t.me/s/x", "status": 200}
    await transport.aclose()


@respx.mock
async def test_default_headers_and_overrides():
    route = respx.get("https://t.me/s/x").mock(return_value=httpx.Response(200))
    transport = fast_transport(headers={"X-Custom": "1"})
    await transport.get("https://t.me/s/x")
    request = route.calls.last.request
    assert "Mozilla" in request.headers["User-Agent"]
    assert request.headers["X-Custom"] == "1"
    await transport.aclose()
