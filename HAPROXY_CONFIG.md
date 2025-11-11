# Configuración de HAProxy para Keycloak

## Configuración Recomendada

Para que Keycloak funcione correctamente detrás de HAProxy con SSL/TLS, agrega esta configuración a tu HAProxy:

```haproxy
frontend https_front
    bind *:443 ssl crt /path/to/sgi-login.snpx.io.pem
    
    # Headers necesarios para Keycloak
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443
    http-request set-header X-Forwarded-Host %[req.hdr(Host)]
    
    # ACL para Keycloak
    acl is_keycloak hdr(host) -i sgi-login.snpx.io
    
    # Backend
    use_backend keycloak_backend if is_keycloak

backend keycloak_backend
    balance roundrobin
    
    # Headers para el backend
    http-request set-header X-Forwarded-For %[src]
    
    # Health check
    option httpchk GET /health/ready
    http-check expect status 200
    
    # Servidor Keycloak
    server keycloak1 localhost:8080 check inter 5s rise 2 fall 3

# Redirect HTTP to HTTPS
frontend http_front
    bind *:80
    
    # Redirect a HTTPS
    redirect scheme https code 301 if !{ ssl_fc }
```

## Configuración Aplicada en Keycloak

El archivo `docker-compose.prod.yml` está configurado con:

- **KC_PROXY_HEADERS=xforwarded**: Usa los headers X-Forwarded-* de HAProxy para determinar el esquema y hostname
- **KC_HTTP_ENABLED=true**: Permite HTTP internamente en el puerto 8080 (HAProxy maneja HTTPS externamente)
- **KC_HOSTNAME=sgi-login.snpx.io**: El dominio público donde Keycloak es accesible
- **KC_HOSTNAME_PORT=-1**: Usa el puerto por defecto según el esquema (443 para HTTPS, 80 para HTTP)
- **KC_HOSTNAME_STRICT=false**: Permite flexibilidad en hostname para comunicación backend
- **KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true**: Permite comunicación backend dinámica

## Verificación

Después de desplegar, verifica:

```bash
# Verificar que Keycloak responde internamente
curl http://localhost:8080/health/ready

# Verificar el acceso público (desde otro servidor o navegador)
curl https://sgi-login.snpx.io/health/ready

# Verificar que los headers se pasan correctamente (desde el servidor local)
curl -I -H "X-Forwarded-Proto: https" -H "X-Forwarded-Port: 443" http://localhost:8080/

# Verificar redirección correcta (debe redirigir a https://sgi-login.snpx.io/admin/)
curl -I https://sgi-login.snpx.io/
```

## URLs de Acceso

- **Consola Admin**: https://sgi-login.snpx.io/admin
- **Realm**: https://sgi-login.snpx.io/realms/myrealm
- **Health Check**: https://sgi-login.snpx.io/health/ready

## Troubleshooting

Si encuentras problemas de redirección o URLs incorrectas:

1. Verifica que HAProxy esté enviando los headers X-Forwarded-*
2. Revisa los logs de Keycloak: `docker logs keycloak-prod`
3. Verifica que `KC_HOSTNAME` coincida exactamente con el dominio en HAProxy
4. Asegúrate de que el certificado SSL en HAProxy sea válido para `sgi-login.snpx.io`

### Comportamiento Esperado

**Sin headers X-Forwarded (acceso directo):**
```bash
curl -I http://localhost:8080/
# Location: http://sgi-login.snpx.io:8080/admin/
```

**Con headers X-Forwarded (a través de HAProxy):**
```bash
curl -I -H "X-Forwarded-Proto: https" -H "X-Forwarded-Port: 443" http://localhost:8080/
# Location: https://sgi-login.snpx.io/admin/
```

Esto es correcto porque Keycloak detecta el esquema y puerto del proxy usando los headers X-Forwarded.

### Notas Importantes

- El puerto interno de Keycloak es **8080** (HTTP)
- HAProxy expone el servicio en el puerto **443** (HTTPS)
- No exponer directamente el puerto 8080 al exterior, solo a través de HAProxy
- HAProxy debe estar configurado para enviar los headers X-Forwarded-Proto, X-Forwarded-Port y X-Forwarded-Host
