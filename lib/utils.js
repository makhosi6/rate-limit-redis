
/**
 * @description Get users real IP address
 * @param {Request} req 
 * @returns 
 */
export function userIP(req) {
  return (
    req.headers['X-Client-IP'] ||
    req.headers['X-Forwarded-For'] || // X-Forwarded-For (Header may return multiple IP addresses in the format: "client IP, proxy 1 IP, proxy 2 IP", so we take the the first one.)
    req.headers['CF-Connecting-IP'] || //( (Cloudflare)
    req.headers['Fastly-Client-Ip'] || //( (Fastly CDN and Firebase hosting header when forwared to a cloud function)
    req.headers['True-Client-Ip'] || //( (Akamai and Cloudflare)
    req.headers['X-Real-IP'] || //( (Nginx proxy/FastCGI)
    req.headers['X-Cluster-Client-IP'] || //( (Rackspace LB, Riverbed Stingray)
    req.headers['X-Forwarded'] ||
    req.headers['Forwarded-For'] ||
    req.headers['Forwarded'] ||
    req.headers['Variations'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    req?.info?.remoteAddress ||
    req.ip
  );
}