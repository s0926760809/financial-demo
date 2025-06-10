{{/*
Expand the name of the chart.
*/}}
{{- define "fintech-chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "fintech-chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "fintech-chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "fintech-chart.labels" -}}
helm.sh/chart: {{ include "fintech-chart.chart" . }}
{{ include "fintech-chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "fintech-chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "fintech-chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "fintech-chart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "fintech-chart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Common annotations
*/}}
{{- define "fintech-chart.annotations" -}}
{{- with .Values.commonAnnotations }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Pod Security Context
*/}}
{{- define "fintech-chart.podSecurityContext" -}}
fsGroup: 2000
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/*
Container Security Context (simplified)
*/}}
{{- define "fintech-chart.securityContext" -}}
allowPrivilegeEscalation: false
capabilities:
  drop:
  - ALL
readOnlyRootFilesystem: false
runAsNonRoot: false
{{- end }}

{{/*
Container Security Context (full)
*/}}
{{- define "fintech-chart.containerSecurityContext" -}}
{{- with .Values.global.securityContext }}
allowPrivilegeEscalation: false
capabilities:
  drop:
  - ALL
readOnlyRootFilesystem: true
runAsNonRoot: true
runAsUser: {{ .runAsUser | default 1001 }}
runAsGroup: {{ .runAsGroup | default 1001 }}
{{- end }}
{{- end }}

{{/*
Backend Resources
*/}}
{{- define "fintech-chart.backend.resources" -}}
{{- with .Values.backend.resources }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Node Selector
*/}}
{{- define "fintech-chart.nodeSelector" -}}
{{- with .Values.nodeSelector }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Tolerations
*/}}
{{- define "fintech-chart.tolerations" -}}
{{- with .Values.tolerations }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
Pod Anti Affinity
*/}}
{{- define "fintech-chart.podAntiAffinity" -}}
{{- with .Values.podAntiAffinity }}
{{- toYaml . }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "fintech-chart.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "fintech-chart.fullname" .) }}
{{- else }}
{{- .Values.postgresql.external.host }}
{{- end }}
{{- end }}

{{/*
PostgreSQL port
*/}}
{{- define "fintech-chart.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.primary.service.ports.postgresql }}
{{- else }}
{{- .Values.postgresql.external.port }}
{{- end }}
{{- end }}

{{/*
PostgreSQL database name
*/}}
{{- define "fintech-chart.postgresql.database" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.postgresql.external.database }}
{{- end }}
{{- end }}

{{/*
PostgreSQL username
*/}}
{{- define "fintech-chart.postgresql.username" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.username }}
{{- else }}
{{- .Values.postgresql.external.username }}
{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "fintech-chart.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis-master" (include "fintech-chart.fullname" .) }}
{{- else }}
{{- .Values.redis.external.host }}
{{- end }}
{{- end }}

{{/*
Redis port
*/}}
{{- define "fintech-chart.redis.port" -}}
{{- if .Values.redis.enabled }}
{{- .Values.redis.master.service.ports.redis }}
{{- else }}
{{- .Values.redis.external.port }}
{{- end }}
{{- end }}

{{/*
Image registry
*/}}
{{- define "fintech-chart.imageRegistry" -}}
{{- .Values.global.imageRegistry | default .Values.image.registry }}
{{- end }}

{{/*
Image tag
*/}}
{{- define "fintech-chart.imageTag" -}}
{{- .Values.global.imageTag | default .Values.image.tag | default .Chart.AppVersion }}
{{- end }}

{{/*
Image pull policy
*/}}
{{- define "fintech-chart.imagePullPolicy" -}}
{{- .Values.global.imagePullPolicy | default .Values.image.pullPolicy }}
{{- end }}

{{/*
Frontend image
*/}}
{{- define "fintech-chart.frontend.image" -}}
{{- printf "%s/frontend:%s" (include "fintech-chart.imageRegistry" .) (include "fintech-chart.imageTag" .) }}
{{- end }}

{{/*
Trading API image
*/}}
{{- define "fintech-chart.trading-api.image" -}}
{{- printf "%s/trading-api:%s" (include "fintech-chart.imageRegistry" .) (include "fintech-chart.imageTag" .) }}
{{- end }}

{{/*
Risk Engine image
*/}}
{{- define "fintech-chart.risk-engine.image" -}}
{{- printf "%s/risk-engine:%s" (include "fintech-chart.imageRegistry" .) (include "fintech-chart.imageTag" .) }}
{{- end }}

{{/*
Payment Gateway image
*/}}
{{- define "fintech-chart.payment-gateway.image" -}}
{{- printf "%s/payment-gateway:%s" (include "fintech-chart.imageRegistry" .) (include "fintech-chart.imageTag" .) }}
{{- end }}

{{/*
Audit Service image
*/}}
{{- define "fintech-chart.audit-service.image" -}}
{{- printf "%s/audit-service:%s" (include "fintech-chart.imageRegistry" .) (include "fintech-chart.imageTag" .) }}
{{- end }}

{{/*
Service names for backend microservices
*/}}
{{- define "fintech-chart.trading-api.name" -}}
{{- printf "%s-trading-api" (include "fintech-chart.fullname" .) }}
{{- end }}

{{- define "fintech-chart.risk-engine.name" -}}
{{- printf "%s-risk-engine" (include "fintech-chart.fullname" .) }}
{{- end }}

{{- define "fintech-chart.payment-gateway.name" -}}
{{- printf "%s-payment-gateway" (include "fintech-chart.fullname" .) }}
{{- end }}

{{- define "fintech-chart.audit-service.name" -}}
{{- printf "%s-audit-service" (include "fintech-chart.fullname" .) }}
{{- end }}

{{- define "fintech-chart.frontend.name" -}}
{{- printf "%s-frontend" (include "fintech-chart.fullname" .) }}
{{- end }} 