# HWP 스킬 패키지

Codex에서 한컴오피스 한글 문서(`.hwp`, `.hwpx`, `.hwpml`)를 읽고, 분석하고, 수정하고, 정해진 양식까지 채울 수 있게 만든 스킬 패키지입니다.

## 폴더 역할

| 폴더 | 역할 |
| --- | --- |
| `skill/hwp-document-suite/` | Codex에 설치되는 실제 스킬 본체 |
| `docs/` | 사람이 읽는 사용법과 구조 설명 |
| `examples/` | 예시 프롬프트와 JSON 매핑 파일 |
| `tools/` | 명령어 치트시트 |

## 기능 역할

| 기능 | 하는 일 | 사용할 때 |
| --- | --- | --- |
| 문서 읽기 | HWP/HWPX/HWPML 내용을 Markdown으로 추출 | 파일 내용이 무엇인지 빠르게 파악할 때 |
| 구조 분석 | JSON 블록, 제목, 표, 이미지, 메타데이터, 컨트롤 구조 추출 | 문서 전체 구조와 표 위치를 찾아야 할 때 |
| 요약 | 추출한 내용을 바탕으로 짧게 정리 | 한 장 분석, 핵심 요약이 필요할 때 |
| 기본 편집 | 검색, 치환, 삽입, 삭제, 표 생성 | HWP 파일 내용을 안전하게 수정할 때 |
| 표 셀 편집 | 특정 HWP 표 셀에 텍스트 입력 | 신청서, 사업계획서 양식 표를 채울 때 |
| 양식 자동 채우기 | JSON 매핑으로 여러 표 셀을 한 번에 작성 | 반복되는 양식 작성 작업을 자동화할 때 |
| 예시문 제거 | 양식 안의 파란색 예시/가이드 문구를 공백 처리 | 기존 예시가 남지 않게 최종 작성본을 만들 때 |
| 결과 검증 | 수정한 파일을 다시 읽거나 렌더링해서 반영 확인 | 편집이나 양식 채우기 후 확인할 때 |

## 주요 파일 역할

| 파일 | 역할 |
| --- | --- |
| `skill/hwp-document-suite/SKILL.md` | Codex가 스킬 사용 시 읽는 핵심 지침 |
| `skill/hwp-document-suite/scripts/hwp_inspect.mjs` | HWP 파일 읽기, 변환, 구조 요약 |
| `skill/hwp-document-suite/scripts/hwp_edit.mjs` | `k-skill-rhwp` 편집 명령 실행 래퍼 |
| `skill/hwp-document-suite/scripts/hwp_fill_cells.mjs` | JSON 매핑으로 HWP 표 여러 칸을 작성 |
| `skill/hwp-document-suite/scripts/hwp_clean_text.mjs` | 예시/가이드 문구를 공백 처리 |
| `skill/hwp-document-suite/references/tooling.md` | 사용 도구와 명령어 참고 문서 |
| `skill/hwp-document-suite/references/business-plan-forms.md` | 창업 지원사업 사업계획서 양식 작성 워크플로 |
| `examples/business-plan-overview-cells.json` | 창업 아이템 개요 요약표 작성 예시 |

## 설치

현재 폴더에서 실행:

```powershell
.\install.ps1
```

macOS/Linux:

```bash
./install.sh
```

수동 설치:

```text
hwp-skill/skill/hwp-document-suite 폴더를 ~/.codex/skills/ 안에 복사
```

## Codex에서 쓰는 예시

문서 읽기/분석:

```text
hwp-document-suite 써서 이 HWP 파일 전체 내용, 표, 이미지, 구조를 한 장으로 요약해줘.
```

문서 수정:

```text
hwp-document-suite 써서 이 HWP 문서에서 2025를 전부 2026으로 바꾼 새 파일 만들어줘.
```

사업계획서 양식 채우기:

```text
hwp-document-suite 써서 창업 아이템 개요 요약표를 내 아이템에 맞게 개조식으로 타이트하게 채워줘. 기존 예시문은 지워줘.
```

## 직접 실행 명령어

문서 읽기와 구조 추출:

```bash
node skill/hwp-document-suite/scripts/hwp_inspect.mjs ./sample.hwp --out-dir ./out
```

HWP 편집:

```bash
node skill/hwp-document-suite/scripts/hwp_edit.mjs replace-all ./sample.hwp ./out/edited.hwp --query 2025 --replacement 2026
```

정해진 양식 표 채우기:

```bash
node skill/hwp-document-suite/scripts/hwp_fill_cells.mjs ./sample.hwp ./out/filled.hwp --map ./examples/business-plan-overview-cells.json
```

예시문 제거만 따로 실행:

```bash
node skill/hwp-document-suite/scripts/hwp_clean_text.mjs ./filled.hwp ./out/cleaned.hwp --preset business-plan-guides
```

## 결과물 원칙

- 원본 HWP/HWPX 파일은 건드리지 않습니다.
- 수정본이나 작성본은 별도 출력 경로에 저장합니다.
- 좌표 탐색용 임시 파일은 검증 후 삭제합니다.
- 표 안의 중첩 가이드 박스 틀은 남을 수 있지만, 제출용 작성본에 보이는 예시 문구는 공백 처리합니다.
