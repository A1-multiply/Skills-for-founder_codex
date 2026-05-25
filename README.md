# Skills-for-founder_codex

창업자와 Codex 사용자를 위한 스킬 모음 저장소입니다.

## 현재 포함된 스킬

- `hwp-skill/`: 한글 문서(HWP/HWPX/HWPML) 처리 스킬
  - 한글 파일 내용을 읽고 Markdown/JSON으로 추출
  - 문서 제목, 본문, 표, 이미지, 메타데이터 구조 분석
  - HWP 본문 텍스트 검색/치환/삽입/삭제
  - HWP 표 셀 내용 수정
  - 정부지원사업 사업계획서 같은 정해진 양식의 표를 JSON으로 자동 채우기

## HWP 스킬 기능 분류

| 구분 | 역할 | 주요 파일 |
| --- | --- | --- |
| 스킬 지침 | Codex가 HWP/HWPX 문서를 언제, 어떻게 처리할지 알려주는 핵심 설명 | `hwp-skill/skill/hwp-document-suite/SKILL.md` |
| 읽기/분석 | HWP/HWPX/HWPML을 Markdown, JSON, 요약 파일로 변환 | `hwp_inspect.mjs` |
| 기본 편집 | `k-skill-rhwp` 기반 정보 조회, 검색, 치환, 삽입, 삭제, 표 생성 실행 | `hwp_edit.mjs` |
| 양식 채우기 | JSON 매핑을 이용해 여러 HWP 표 셀을 한 번에 작성 | `hwp_fill_cells.mjs` |
| 사업계획서 양식 | 예비창업패키지 등 창업 지원사업 양식 작성 절차 정리 | `business-plan-forms.md` |
| 예시 매핑 | 창업 아이템 개요 요약표 자동 작성 예시 | `business-plan-overview-cells.json` |

## 설치

```powershell
cd hwp-skill
.\install.ps1
```

macOS/Linux:

```bash
cd hwp-skill
./install.sh
```

수동 설치:

```text
hwp-skill/skill/hwp-document-suite 폴더를 ~/.codex/skills/ 안에 복사
```

## 먼저 볼 문서

자세한 사용법은 `hwp-skill/README.md`를 확인하세요.
